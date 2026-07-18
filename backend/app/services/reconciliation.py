"""SQLAlchemy bridge for P1's deterministic reconciliation core.

The matching and allocation modules remain database-independent.  This module
maps canonical ORM rows to those immutable snapshots, revalidates allocation
plans while rows are locked, and leaves commit/rollback ownership to the
caller.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Iterable, Mapping, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import PaymentAllocation as PaymentAllocationModel
from app.models.payment import PaymentIntent as PaymentIntentModel
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.sale import Sale as SaleModel
from app.models.transaction import BankTransaction as BankTransactionModel
from app.services.allocation import (
    AllocationLeg,
    AllocationPlan,
    AllocationType,
    allocate_payment,
)
from app.services.matching import (
    DEFAULT_MATCHING_CONFIG,
    ZERO,
    AllocationSnapshot,
    BankTransaction,
    MatchAction,
    MatchCandidate,
    MatchDecision,
    MatchingConfig,
    PaymentIntent,
    PaymentIntentStatus,
    PaymentStatus,
    Sale,
    candidate_match,
    exact_match,
    extract_payment_reference,
)


class ReconciliationIntegrationError(ValueError):
    """Raised when canonical data cannot safely be mapped or persisted."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class MatchingContext:
    transaction: BankTransaction
    sales: tuple[Sale, ...]
    payment_intents: tuple[PaymentIntent, ...]
    allocations: tuple[AllocationSnapshot, ...]


@dataclass(frozen=True)
class PaymentReferenceResult:
    reference: str
    payment_intent_id: str
    sale_id: str
    merchant_id: str
    amount: Decimal
    status: str
    expires_at: datetime


@dataclass(frozen=True)
class ExceptionPersistenceResult:
    record: ExceptionRecord
    created: bool


@dataclass(frozen=True)
class PeriodReconciliationSummary:
    case_id: str
    merchant_id: str
    period: str
    transactions_scanned: int
    matched: int
    exceptions: int
    ambiguous: int
    no_match: int
    review_required: int
    cash_discrepancies: int
    matched_transaction_ids: tuple[str, ...]
    exception_ids: tuple[int, ...]


def _as_utc(value: datetime) -> datetime:
    # PostgreSQL returns aware values.  SQLite drops timezone metadata, so the
    # dedicated integration fixture is normalized at this adapter boundary.
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _enum_value(enum_type, value: str, *, field: str):
    try:
        return enum_type(str(value).upper())
    except ValueError as exc:
        raise ReconciliationIntegrationError(
            "INVALID_CANONICAL_STATUS", f"unsupported {field}: {value!r}"
        ) from exc


def _period_bounds(period: str) -> tuple[datetime, datetime]:
    try:
        year_text, month_text = period.split("-", maxsplit=1)
        year = int(year_text)
        month = int(month_text)
        start = datetime(year, month, 1, tzinfo=timezone.utc)
    except (TypeError, ValueError) as exc:
        raise ReconciliationIntegrationError(
            "INVALID_PERIOD", "period must use YYYY-MM format"
        ) from exc
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


def _transaction_direction(transaction_type: str | None) -> str:
    value = (transaction_type or "in").casefold()
    if value in {"out", "refund", "debit"}:
        return "out"
    return "in"


async def _load_matching_context(
    session: AsyncSession,
    transaction_id: str,
    *,
    for_update: bool = False,
) -> MatchingContext:
    transaction_stmt = select(BankTransactionModel).where(
        BankTransactionModel.id == transaction_id
    )
    if for_update:
        transaction_stmt = transaction_stmt.with_for_update()
    transaction_row = await session.scalar(transaction_stmt)
    if transaction_row is None:
        raise ReconciliationIntegrationError(
            "TRANSACTION_NOT_FOUND", f"transaction {transaction_id} was not found"
        )

    sales_stmt = select(SaleModel).where(
        SaleModel.merchant_id == transaction_row.merchant_id
    )
    intents_stmt = select(PaymentIntentModel).where(
        PaymentIntentModel.merchant_id == transaction_row.merchant_id
    )
    allocations_stmt = (
        select(PaymentAllocationModel)
        .join(SaleModel, PaymentAllocationModel.sale_id == SaleModel.id)
        .where(SaleModel.merchant_id == transaction_row.merchant_id)
    )
    transaction_allocations_stmt = select(PaymentAllocationModel).where(
        PaymentAllocationModel.bank_transaction_id == transaction_row.id
    )
    if for_update:
        sales_stmt = sales_stmt.with_for_update()
        intents_stmt = intents_stmt.with_for_update()
        allocations_stmt = allocations_stmt.with_for_update()
        transaction_allocations_stmt = transaction_allocations_stmt.with_for_update()

    sale_rows = tuple((await session.scalars(sales_stmt)).all())
    intent_rows = tuple((await session.scalars(intents_stmt)).all())
    merchant_allocation_rows = tuple(
        (await session.scalars(allocations_stmt)).all()
    )
    transaction_allocation_rows = tuple(
        (await session.scalars(transaction_allocations_stmt)).all()
    )
    allocation_rows = tuple(
        {
            row.id: row
            for row in (*merchant_allocation_rows, *transaction_allocation_rows)
        }.values()
    )

    sale_allocated: dict[str, Decimal] = {}
    intent_allocated: dict[str, Decimal] = {}
    transaction_allocated = ZERO
    allocation_snapshots: list[AllocationSnapshot] = []
    for row in allocation_rows:
        amount = Decimal(row.amount)
        if row.sale_id is not None:
            sale_allocated[row.sale_id] = sale_allocated.get(row.sale_id, ZERO) + amount
        if row.payment_intent_id is not None:
            intent_allocated[row.payment_intent_id] = (
                intent_allocated.get(row.payment_intent_id, ZERO) + amount
            )
        if row.bank_transaction_id == transaction_row.id:
            transaction_allocated += abs(amount)
        if row.bank_transaction_id is not None:
            allocation_snapshots.append(
                AllocationSnapshot(
                    bank_transaction_id=row.bank_transaction_id,
                    # The Sprint 1 AllocationSnapshot requires a sale id, but
                    # P4's canonical model permits legacy allocation rows with
                    # sale_id=NULL.  A sentinel keeps those rows in transaction
                    # capacity revalidation without assigning them to a sale.
                    sale_id=row.sale_id or f"__UNASSIGNED__:{row.id}",
                    amount=amount,
                    payment_intent_id=row.payment_intent_id,
                    allocation_type=row.allocation_type,
                )
            )

    direction = _transaction_direction(transaction_row.transaction_type)
    stored_amount = Decimal(transaction_row.amount)
    if stored_amount < ZERO and direction == "in":
        raise ReconciliationIntegrationError(
            "TRANSACTION_SIGN_MISMATCH",
            "incoming canonical transactions cannot have a negative amount",
        )
    domain_amount = -abs(stored_amount) if direction == "out" else abs(stored_amount)
    transaction = BankTransaction(
        id=transaction_row.id,
        merchant_id=transaction_row.merchant_id,
        amount=domain_amount,
        transaction_date=_as_utc(transaction_row.transaction_date),
        payment_code=transaction_row.payment_code,
        raw_note=transaction_row.raw_note,
        sender_name=transaction_row.sender_name,
        direction=direction,
        allocated_amount=transaction_allocated,
    )
    sales = tuple(
        Sale(
            id=row.id,
            merchant_id=row.merchant_id,
            store_id=row.store_id,
            net_amount=Decimal(row.net_amount),
            created_at=_as_utc(row.created_at),
            payment_status=_enum_value(
                PaymentStatus, row.payment_status, field="sale.payment_status"
            ),
            net_allocated_amount=sale_allocated.get(row.id, ZERO),
            # ORDER-* is owned by the sale.  Payment-intent IDs are deliberately
            # excluded so an expired/invalid PAY-* cannot bypass exact matching.
            identifiers=(row.id,),
        )
        for row in sale_rows
    )
    payment_intents = tuple(
        PaymentIntent(
            id=row.id,
            sale_id=row.sale_id,
            merchant_id=row.merchant_id,
            amount=Decimal(row.amount),
            status=_enum_value(
                PaymentIntentStatus, row.status, field="payment_intent.status"
            ),
            expires_at=_as_utc(row.expires_at),
            allocated_amount=intent_allocated.get(row.id, ZERO),
        )
        for row in intent_rows
    )
    return MatchingContext(
        transaction=transaction,
        sales=sales,
        payment_intents=payment_intents,
        allocations=tuple(allocation_snapshots),
    )


async def score_transaction_candidates(
    session: AsyncSession,
    transaction_id: str,
    *,
    time_window_minutes: int = 60,
    known_sender_names: Iterable[str] = (),
    note_signals: Mapping[str, int] | None = None,
) -> list[MatchCandidate]:
    """Score candidates using the canonical transaction identified by ID."""

    if not 1 <= time_window_minutes <= 24 * 60:
        raise ReconciliationIntegrationError(
            "INVALID_TIME_WINDOW", "time_window_minutes must be between 1 and 1440"
        )
    context = await _load_matching_context(session, transaction_id)
    config: MatchingConfig = replace(
        DEFAULT_MATCHING_CONFIG,
        candidate_window=timedelta(minutes=time_window_minutes),
    )
    return candidate_match(
        context.transaction,
        context.sales,
        known_sender_names=known_sender_names,
        note_signals=note_signals,
        config=config,
    )


async def find_payment_reference_record(
    session: AsyncSession, reference_number: str
) -> PaymentReferenceResult | None:
    """Resolve only a syntactically valid canonical PAY-* reference."""

    reference = extract_payment_reference(reference_number, None)
    if reference is None:
        return None
    row = await session.scalar(
        select(PaymentIntentModel).where(PaymentIntentModel.id == reference)
    )
    if row is None:
        return None
    return PaymentReferenceResult(
        reference=reference,
        payment_intent_id=row.id,
        sale_id=row.sale_id,
        merchant_id=row.merchant_id,
        amount=Decimal(row.amount),
        status=row.status,
        expires_at=_as_utc(row.expires_at),
    )


async def persist_allocation_plan(
    session: AsyncSession, plan: AllocationPlan
) -> AllocationPlan:
    """Revalidate and flush an allocation plan under row locks.

    The caller must wrap this call in its database transaction and commit or
    roll back the complete reconciliation operation.
    """

    context = await _load_matching_context(
        session, plan.transaction_id, for_update=True
    )
    legs = tuple(
        AllocationLeg(
            sale_id=item.sale_id,
            amount=item.amount,
            allocation_type=item.allocation_type,
            payment_intent_id=item.payment_intent_id,
            match_method=item.match_method,
            confidence=item.confidence,
            confidence_method=item.confidence_method,
        )
        for item in plan.allocations
    )
    validated = allocate_payment(
        context.transaction,
        legs,
        context.sales,
        payment_intents=context.payment_intents,
        existing_allocations=context.allocations,
    )
    if validated != plan:
        raise ReconciliationIntegrationError(
            "STALE_ALLOCATION_PLAN",
            "canonical balances changed after the allocation plan was created",
        )

    for item in validated.allocations:
        # P4's Sprint 1 model has no confidence_method column. Never persist a
        # heuristic number without its method label; both fields can be added
        # together in a later migration. Exact confidence remains auditable
        # through match_method=EXACT.
        persisted_confidence = (
            item.confidence if item.confidence_method != "heuristic_v1" else None
        )
        session.add(
            PaymentAllocationModel(
                bank_transaction_id=item.bank_transaction_id,
                payment_intent_id=item.payment_intent_id,
                sale_id=item.sale_id,
                amount=item.amount,
                allocation_type=item.allocation_type.value,
                match_method=item.match_method.value,
                confidence=persisted_confidence,
            )
        )

    sales_by_id = {
        row.id: row
        for row in (
            await session.scalars(
                select(SaleModel).where(
                    SaleModel.id.in_([item.sale_id for item in validated.sale_updates])
                )
            )
        ).all()
    }
    for update in validated.sale_updates:
        sales_by_id[update.sale_id].payment_status = update.new_status.value

    intent_ids = [
        item.payment_intent_id for item in validated.payment_intent_updates
    ]
    if intent_ids:
        intents_by_id = {
            row.id: row
            for row in (
                await session.scalars(
                    select(PaymentIntentModel).where(
                        PaymentIntentModel.id.in_(intent_ids)
                    )
                )
            ).all()
        }
        for update in validated.payment_intent_updates:
            intents_by_id[update.payment_intent_id].status = update.new_status.value

    await session.flush()
    return validated


async def persist_match_decision(
    session: AsyncSession, decision: MatchDecision | MatchCandidate, transaction_id: str
) -> AllocationPlan:
    """Convert an AUTO_MATCH decision into an allocation and persist it."""

    if decision.action != MatchAction.AUTO_MATCH:
        raise ReconciliationIntegrationError(
            "DECISION_NOT_AUTOMATCH", "only AUTO_MATCH decisions may be persisted"
        )
    context = await _load_matching_context(session, transaction_id)
    if isinstance(decision, MatchDecision):
        sale_id = decision.matched_sale_id
        amount = decision.allocation_amount
        intent_id = decision.matched_payment_intent_id
        allocation_type = AllocationType(decision.allocation_type or "PAYMENT")
    else:
        sale_id = decision.sale_id
        amount = context.transaction.amount
        intent_id = None
        allocation_type = AllocationType.PAYMENT
    if sale_id is None or amount is None:
        raise ReconciliationIntegrationError(
            "INCOMPLETE_MATCH_DECISION", "match decision lacks sale or amount"
        )
    leg = AllocationLeg(
        sale_id=sale_id,
        amount=amount,
        allocation_type=allocation_type,
        payment_intent_id=intent_id,
        match_method=decision.method,
        confidence=decision.confidence,
        confidence_method=decision.confidence_method,
    )
    plan = allocate_payment(
        context.transaction,
        (leg,),
        context.sales,
        payment_intents=context.payment_intents,
        existing_allocations=context.allocations,
    )
    return await persist_allocation_plan(session, plan)


async def _validated_case(
    session: AsyncSession,
    case_id: str,
    merchant_id: str,
    period: str,
) -> ReconciliationCase:
    case = await session.scalar(
        select(ReconciliationCase)
        .where(ReconciliationCase.id == case_id)
        .with_for_update()
    )
    if case is None:
        raise ReconciliationIntegrationError(
            "CASE_NOT_FOUND", f"reconciliation case {case_id} was not found"
        )
    if case.merchant_id != merchant_id or case.period != period:
        raise ReconciliationIntegrationError(
            "CASE_SCOPE_MISMATCH",
            "case merchant/period does not match the requested reconciliation scope",
        )
    return case


async def create_exception_record(
    session: AsyncSession,
    *,
    case_id: str,
    merchant_id: str,
    period: str,
    exception_type: str,
    reason: str,
    ai_suggestion: Mapping[str, object] | None = None,
    transaction_id: str | None = None,
    sale_id: str | None = None,
    dedupe_key: str | None = None,
) -> ExceptionPersistenceResult:
    """Create an idempotent exception under a caller-owned case."""

    await _validated_case(session, case_id, merchant_id, period)
    if transaction_id is not None:
        transaction = await session.scalar(
            select(BankTransactionModel).where(
                BankTransactionModel.id == transaction_id
            )
        )
        if transaction is None or transaction.merchant_id != merchant_id:
            raise ReconciliationIntegrationError(
                "TRANSACTION_SCOPE_MISMATCH",
                "exception transaction does not belong to the case merchant",
            )
    if sale_id is not None:
        sale = await session.scalar(select(SaleModel).where(SaleModel.id == sale_id))
        if sale is None or sale.merchant_id != merchant_id:
            raise ReconciliationIntegrationError(
                "SALE_SCOPE_MISMATCH",
                "exception sale does not belong to the case merchant",
            )

    key = dedupe_key or ":".join(
        [exception_type, transaction_id or "-", sale_id or "-", reason]
    )
    existing_rows = tuple(
        (
            await session.scalars(
                select(ExceptionRecord).where(
                    ExceptionRecord.case_id == case_id,
                    ExceptionRecord.exception_type == exception_type,
                    ExceptionRecord.bank_transaction_id == transaction_id,
                    ExceptionRecord.sale_id == sale_id,
                )
            )
        ).all()
    )
    for existing in existing_rows:
        payload = existing.ai_suggestion or {}
        if payload.get("dedupe_key") == key:
            return ExceptionPersistenceResult(record=existing, created=False)

    payload = dict(ai_suggestion or {})
    payload.update({"reason": reason, "dedupe_key": key})
    record = ExceptionRecord(
        case_id=case_id,
        bank_transaction_id=transaction_id,
        sale_id=sale_id,
        exception_type=exception_type,
        ai_suggestion=payload,
        status="PENDING",
    )
    session.add(record)
    await session.flush()
    return ExceptionPersistenceResult(record=record, created=True)


def _candidate_payload(candidates: Sequence[MatchCandidate]) -> list[dict[str, object]]:
    return [
        {
            "sale_id": candidate.sale_id,
            "action": candidate.action.value,
            "deterministic_score": candidate.deterministic_score,
            "display_score": candidate.display_score,
            "confidence": str(candidate.confidence),
            "confidence_method": candidate.confidence_method,
            "reason_codes": list(candidate.reason_codes),
        }
        for candidate in candidates[:5]
    ]


async def reconcile_period(
    session: AsyncSession,
    *,
    case_id: str,
    merchant_id: str,
    period: str,
    known_sender_names: Iterable[str] = (),
) -> PeriodReconciliationSummary:
    """Reconcile one merchant period without committing the DB transaction."""

    from app.models.cash import CashSession
    from app.models.merchant import Store
    from app.services.cash_reconciliation import reconcile_cash_session

    await _validated_case(session, case_id, merchant_id, period)
    start, end = _period_bounds(period)
    transaction_rows = tuple(
        (
            await session.scalars(
                select(BankTransactionModel)
                .where(
                    BankTransactionModel.merchant_id == merchant_id,
                    BankTransactionModel.transaction_date >= start,
                    BankTransactionModel.transaction_date < end,
                )
                .order_by(
                    BankTransactionModel.transaction_date,
                    BankTransactionModel.id,
                )
            )
        ).all()
    )

    matched_ids: list[str] = []
    exception_ids: list[int] = []
    ambiguous = 0
    no_match = 0
    review_required = 0

    for transaction_row in transaction_rows:
        already_allocated = await session.scalar(
            select(PaymentAllocationModel.id)
            .where(
                PaymentAllocationModel.bank_transaction_id == transaction_row.id
            )
            .limit(1)
        )
        if already_allocated is not None:
            matched_ids.append(transaction_row.id)
            continue

        context = await _load_matching_context(session, transaction_row.id)
        exact_decision = exact_match(
            context.transaction,
            context.payment_intents,
            context.sales,
            context.allocations,
            # Reconciliation may run after the period closes. Intent validity
            # is evaluated when the bank transfer occurred, not at batch time.
            now=context.transaction.transaction_date,
        )
        if exact_decision.action == MatchAction.AUTO_MATCH:
            await persist_match_decision(session, exact_decision, transaction_row.id)
            matched_ids.append(transaction_row.id)
            continue

        candidates: list[MatchCandidate] = []
        if exact_decision.action == MatchAction.UNMATCHED:
            candidates = candidate_match(
                context.transaction,
                context.sales,
                known_sender_names=known_sender_names,
            )
        if candidates and candidates[0].action == MatchAction.AUTO_MATCH:
            await persist_match_decision(session, candidates[0], transaction_row.id)
            matched_ids.append(transaction_row.id)
            continue

        top = candidates[0] if candidates else None
        reason_codes = (
            top.reason_codes if top is not None else exact_decision.reason_codes
        )
        if top is not None and (
            "AMBIGUOUS_CANDIDATES" in top.reason_codes
            or "UNRESOLVED_DUPLICATE_AMOUNT" in top.reason_codes
        ):
            exception_type = "AMBIGUOUS_MATCH"
            ambiguous += 1
        elif top is None and exact_decision.action in {
            MatchAction.HUMAN_CONFIRM,
            MatchAction.INVALID,
        }:
            exception_type = (
                "REFUND_REVIEW"
                if context.transaction.amount < ZERO
                else "MATCH_REVIEW"
            )
            review_required += 1
        elif top is None or top.action == MatchAction.UNMATCHED:
            exception_type = "NO_MATCH"
            no_match += 1
        else:
            exception_type = "MATCH_REVIEW"
            review_required += 1
        persisted = await create_exception_record(
            session,
            case_id=case_id,
            merchant_id=merchant_id,
            period=period,
            exception_type=exception_type,
            reason=",".join(reason_codes) or "NO_ELIGIBLE_CANDIDATE",
            ai_suggestion={"candidates": _candidate_payload(candidates)},
            transaction_id=transaction_row.id,
            sale_id=top.sale_id if top is not None else None,
            dedupe_key=f"bank:{transaction_row.id}:{exception_type}",
        )
        exception_ids.append(persisted.record.id)

    cash_rows = tuple(
        (
            await session.scalars(
                select(CashSession)
                .join(Store, CashSession.store_id == Store.id)
                .where(
                    Store.merchant_id == merchant_id,
                    CashSession.opened_at >= start,
                    CashSession.opened_at < end,
                )
                .order_by(CashSession.id)
            )
        ).all()
    )
    cash_discrepancies = 0
    for cash_row in cash_rows:
        cash_result = await reconcile_cash_session(session, cash_row.id)
        if cash_result.discrepancy != ZERO:
            cash_discrepancies += 1
            persisted = await create_exception_record(
                session,
                case_id=case_id,
                merchant_id=merchant_id,
                period=period,
                exception_type="CASH_DISCREPANCY",
                reason=f"cash discrepancy {cash_result.discrepancy}",
                ai_suggestion={
                    "cash_session_id": cash_result.cash_session_id,
                    "opening_cash": str(cash_result.opening_cash),
                    "cash_sales": str(cash_result.cash_sales),
                    "cash_expenses": str(cash_result.cash_expenses),
                    "expected_cash": str(cash_result.expected_cash),
                    "counted_cash": str(cash_result.counted_cash),
                    "discrepancy": str(cash_result.discrepancy),
                },
                dedupe_key=f"cash:{cash_result.cash_session_id}",
            )
            exception_ids.append(persisted.record.id)

    return PeriodReconciliationSummary(
        case_id=case_id,
        merchant_id=merchant_id,
        period=period,
        transactions_scanned=len(transaction_rows),
        matched=len(matched_ids),
        exceptions=len(exception_ids),
        ambiguous=ambiguous,
        no_match=no_match,
        review_required=review_required,
        cash_discrepancies=cash_discrepancies,
        matched_transaction_ids=tuple(matched_ids),
        exception_ids=tuple(exception_ids),
    )
