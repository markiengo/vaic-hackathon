"""Real DB-backed implementations of the 19 agent tools (Sprint 2).

Signatures are P2's (docs/05-domain/01-ai-advisor.md § Tool contracts):
JSON-serializable arguments only, no `db`/session parameter, since these are
called via LLM typed function-calling. Each tool opens its own short-lived
`AsyncSession` rather than sharing one across a call. Every call is traced
via `@traced_tool`, which writes `tool_calls` + `audit_events`
(DEC-001/DEC-004) — see `app/tools/_tracing.py`.

The original stubs were plain (synchronous) `def`s that raised
`NotImplementedError`; they are now `async def` because every one of them
does async I/O. Nothing in the codebase called them yet (the specialist
LangGraph nodes are still placeholders — see `app/agents/graph.py`), so
this is a zero-risk interface completion, not a breaking change.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.cash import CashSession
from app.models.invoice import Invoice
from app.models.merchant import Merchant, Store
from app.models.payment import PaymentAllocation, PaymentIntent
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.sale import Sale, SaleLine
from app.models.tax import TaxClassification, TaxRuleVersion
from app.models.transaction import BankTransaction
from app.models.user import User
from app.schemas.agent import (
    MatchCandidate,
    MerchantMessageDraft,
    ReconciliationExceptionDraft,
    TaxReadinessReport,
    ToolCallResult,
)
from app.services import export as export_service
from app.services import tax_rules as tax_rules_service
from app.services.confirmation_tokens import (
    InvalidConfirmationToken,
    decode_confirmation_token,
    generate_confirmation_token,
)
from app.services.matching import ZERO as MATCH_ZERO
from app.services.matching import MatchingConfig
from app.services.matching import BankTransaction as MatchBankTransaction
from app.services.matching import PaymentStatus as MatchPaymentStatus
from app.services.matching import Sale as MatchSale
from app.services.matching import candidate_match
from app.services.revenue_classifier import classify_revenue
from app.tools._tracing import traced_tool

JSONValue = str | int | float | bool | None | dict[str, Any] | list[Any]
JSONDict = dict[str, JSONValue]
JSONList = list[JSONDict]

_period_bounds = export_service.period_bounds


def _dec(value: Decimal | None) -> str | None:
    return str(value) if value is not None else None


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


# ---------------------------------------------------------------------------
# Bank / source retrieval tools
# ---------------------------------------------------------------------------


@traced_tool
async def get_bank_transactions(merchant_id: str, period: str) -> JSONList:
    """Return bank transactions for a merchant and period."""

    start, end = _period_bounds(period)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(BankTransaction)
            .where(
                BankTransaction.merchant_id == merchant_id,
                BankTransaction.transaction_date >= start,
                BankTransaction.transaction_date < end,
            )
            .order_by(BankTransaction.transaction_date)
        )
        rows = result.scalars().all()
        return [
            {
                "id": row.id,
                "merchant_id": row.merchant_id,
                "account_number": row.account_number,
                "amount": _dec(row.amount),
                "sender_name": row.sender_name,
                "raw_note": row.raw_note,
                "normalized_note": row.normalized_note,
                "transaction_type": row.transaction_type,
                "reference_number": row.reference_number,
                "payment_code": row.payment_code,
                "source": row.source,
                "source_id": row.source_id,
                "transaction_date": _iso(row.transaction_date),
            }
            for row in rows
        ]


@traced_tool
async def get_sales_orders(merchant_id: str, period: str) -> JSONList:
    """Return sales orders (with line items) for a merchant and period."""

    start, end = _period_bounds(period)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Sale)
            .where(
                Sale.merchant_id == merchant_id,
                Sale.created_at >= start,
                Sale.created_at < end,
            )
            .order_by(Sale.created_at)
        )
        sales = result.scalars().all()
        sale_ids = [sale.id for sale in sales]

        lines_by_sale: dict[str, list[JSONDict]] = {sale_id: [] for sale_id in sale_ids}
        if sale_ids:
            lines_result = await db.execute(
                select(SaleLine).where(SaleLine.sale_id.in_(sale_ids))
            )
            for line in lines_result.scalars().all():
                lines_by_sale.setdefault(line.sale_id, []).append(
                    {
                        "product_id": line.product_id,
                        "product_name": line.product_name,
                        "quantity": line.quantity,
                        "unit_price": _dec(line.unit_price),
                        "line_total": _dec(line.line_total),
                    }
                )

        return [
            {
                "id": sale.id,
                "merchant_id": sale.merchant_id,
                "store_id": sale.store_id,
                "gross_amount": _dec(sale.gross_amount),
                "discount": _dec(sale.discount),
                "net_amount": _dec(sale.net_amount),
                "payment_status": sale.payment_status,
                "invoice_status": sale.invoice_status,
                "created_at": _iso(sale.created_at),
                "lines": lines_by_sale.get(sale.id, []),
            }
            for sale in sales
        ]


@traced_tool
async def get_cash_sessions(merchant_id: str, period: str) -> JSONList:
    """Return cash sessions for a merchant and period (joined via stores)."""

    start, end = _period_bounds(period)
    async with AsyncSessionLocal() as db:
        store_ids_subq = select(Store.id).where(Store.merchant_id == merchant_id)
        result = await db.execute(
            select(CashSession)
            .where(
                CashSession.store_id.in_(store_ids_subq),
                CashSession.opened_at >= start,
                CashSession.opened_at < end,
            )
            .order_by(CashSession.opened_at)
        )
        rows = result.scalars().all()
        return [
            {
                "id": row.id,
                "store_id": row.store_id,
                "opening_cash": _dec(row.opening_cash),
                "expected_cash": _dec(row.expected_cash),
                "counted_cash": _dec(row.counted_cash),
                "cash_expenses": _dec(row.cash_expenses),
                "discrepancy": _dec(row.discrepancy),
                "discrepancy_reason": row.discrepancy_reason,
                "status": row.status,
                "opened_at": _iso(row.opened_at),
                "closed_at": _iso(row.closed_at),
            }
            for row in rows
        ]


@traced_tool
async def get_invoices(merchant_id: str, period: str) -> JSONList:
    """Return invoices for a merchant and period."""

    start, end = _period_bounds(period)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Invoice)
            .where(
                Invoice.merchant_id == merchant_id,
                Invoice.invoice_date >= start,
                Invoice.invoice_date < end,
            )
            .order_by(Invoice.invoice_date)
        )
        rows = result.scalars().all()
        return [
            {
                "id": row.id,
                "sale_id": row.sale_id,
                "merchant_id": row.merchant_id,
                "invoice_number": row.invoice_number,
                "amount": _dec(row.amount),
                "invoice_date": _iso(row.invoice_date),
                "status": row.status,
                "source": row.source,
            }
            for row in rows
        ]


@traced_tool
async def find_payment_reference(reference_number: str) -> JSONDict | None:
    """Look up a TaxLens payment reference (a payment_intent id, e.g.
    'PAY-A8F21X') in the canonical ledger."""

    async with AsyncSessionLocal() as db:
        intent = await db.get(PaymentIntent, reference_number.strip().upper())
        if intent is None:
            return None
        return {
            "id": intent.id,
            "sale_id": intent.sale_id,
            "merchant_id": intent.merchant_id,
            "amount": _dec(intent.amount),
            "status": intent.status,
            "expires_at": _iso(intent.expires_at),
        }


# ---------------------------------------------------------------------------
# Matching tools
# ---------------------------------------------------------------------------


@traced_tool
async def score_match_candidates(
    merchant_id: str,
    amount: Decimal,
    time_window_minutes: int = 60,
    sender_name: str | None = None,
    note: str | None = None,
) -> list[MatchCandidate]:
    """Score candidate sale matches for a transaction described by amount/
    sender/note. Thin wrapper around P1's deterministic
    `app.services.matching.candidate_match` — never auto-matches; only
    ranks candidates for `HUMAN_CONFIRM`/`UNMATCHED` review.

    The transaction being scored may not exist as a bank_transactions row
    yet (an agent can ask "what would match a transfer like this"), so this
    builds an ephemeral, un-persisted `MatchBankTransaction` snapshot using
    the current time as its reference timestamp for time-proximity scoring.
    """

    now = datetime.now(timezone.utc)
    probe = MatchBankTransaction(
        id="PROBE",
        merchant_id=merchant_id,
        amount=Decimal(amount),
        transaction_date=now,
        raw_note=note,
        sender_name=sender_name,
        direction="in",
    )

    async with AsyncSessionLocal() as db:
        sales_result = await db.execute(
            select(Sale).where(
                Sale.merchant_id == merchant_id,
                Sale.payment_status.in_(["UNPAID", "PARTIAL"]),
            )
        )
        sale_rows = sales_result.scalars().all()

        allocated_by_sale: dict[str, Decimal] = {}
        if sale_rows:
            alloc_result = await db.execute(
                select(PaymentAllocation.sale_id, func.sum(PaymentAllocation.amount)).where(
                    PaymentAllocation.sale_id.in_([sale.id for sale in sale_rows])
                ).group_by(PaymentAllocation.sale_id)
            )
            allocated_by_sale = {row[0]: row[1] for row in alloc_result.all() if row[0] is not None}

        candidate_sales = [
            MatchSale(
                id=sale.id,
                merchant_id=sale.merchant_id,
                store_id=sale.store_id,
                net_amount=sale.net_amount,
                created_at=sale.created_at,
                payment_status=MatchPaymentStatus(sale.payment_status),
                net_allocated_amount=allocated_by_sale.get(sale.id, MATCH_ZERO),
            )
            for sale in sale_rows
        ]

        known_senders_result = await db.execute(
            select(BankTransaction.sender_name)
            .where(BankTransaction.merchant_id == merchant_id, BankTransaction.sender_name.isnot(None))
            .distinct()
        )
        known_sender_names = [row[0] for row in known_senders_result.all()]

    config = MatchingConfig(candidate_window=timedelta(minutes=time_window_minutes))
    candidates = candidate_match(
        probe, candidate_sales, known_sender_names=known_sender_names, config=config
    )

    return [
        MatchCandidate(
            sale_id=candidate.sale_id,
            transaction_id=None,
            score=Decimal(candidate.display_score),
            confidence=candidate.confidence,
            reasoning=[factor.detail for factor in candidate.factors]
            + [f"action={candidate.action.value}", f"method={candidate.method.value}"]
            + list(candidate.reason_codes),
        )
        for candidate in candidates
    ]


@traced_tool
async def create_reconciliation_exception(
    case_id: str,
    merchant_id: str,
    period: str,
    exception_type: str,
    reason: str,
    ai_suggestion: JSONDict | None = None,
) -> ReconciliationExceptionDraft:
    """Create a reconciliation exception, opening its case if needed.

    `case_id` is caller-supplied (see `create_case`'s deterministic
    `CASE-{merchant_id}-{period}` id) but the exception tool tolerates a
    not-yet-created case rather than failing the whole reconciliation run
    over ordering — a case is a container, and the Reconciliation Agent may
    discover exceptions before Merchant Ops has opened a case for them.
    """

    async with AsyncSessionLocal() as db:
        case = await db.get(ReconciliationCase, case_id)
        if case is None:
            case = ReconciliationCase(
                id=case_id, merchant_id=merchant_id, period=period, status="OPEN"
            )
            db.add(case)
            await db.flush()

        record = ExceptionRecord(
            case_id=case_id,
            exception_type=exception_type,
            ai_suggestion={"reason": reason, **(ai_suggestion or {})},
            status="PENDING",
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        return ReconciliationExceptionDraft(
            case_id=case_id,
            merchant_id=merchant_id,
            period=period,
            exception_type=exception_type,
            reason=reason,
            # The schema has no id/status fields; carry them in ai_suggestion
            # so the caller can still see what was actually persisted.
            ai_suggestion={**(record.ai_suggestion or {}), "exception_id": record.id, "status": record.status},
        )


# ---------------------------------------------------------------------------
# Tax tools
# ---------------------------------------------------------------------------


@traced_tool
async def retrieve_tax_rules(merchant_segment: str, business_vertical: str) -> JSONDict | None:
    """Return the active APPROVED tax rule bundle for a merchant segment."""

    async with AsyncSessionLocal() as db:
        rule = await tax_rules_service.retrieve_tax_rules(db, merchant_segment, business_vertical)
        if rule is None:
            return None
        return {
            "version": rule.version,
            "merchant_type": rule.merchant_type,
            "business_category": rule.business_category,
            "effective_from": rule.effective_from.isoformat() if rule.effective_from else None,
            "effective_to": rule.effective_to.isoformat() if rule.effective_to else None,
            "required_fields": rule.required_fields,
            "formula_or_validation": rule.formula_or_validation,
            "legal_source": rule.legal_source,
            "approval_status": rule.approval_status,
            "approved_by": rule.approved_by,
        }


@traced_tool
async def validate_rule_version(rule_version: str) -> JSONDict:
    """Validate that a specific tax rule version exists, is approved, and is
    currently in effect."""

    async with AsyncSessionLocal() as db:
        validation = await tax_rules_service.validate_rule_version(db, rule_version)
        return {
            "version": validation.version,
            "valid": validation.valid,
            "approval_status": validation.approval_status,
            "effective_from": validation.effective_from.isoformat() if validation.effective_from else None,
            "effective_to": validation.effective_to.isoformat() if validation.effective_to else None,
            "is_currently_effective": validation.is_currently_effective,
            "reason": validation.reason,
        }


async def _amount_matches_outstanding_sale(db: AsyncSession, merchant_id: str, amount: Decimal) -> bool:
    result = await db.execute(
        select(func.count(Sale.id)).where(
            Sale.merchant_id == merchant_id,
            Sale.payment_status.in_(["UNPAID", "PARTIAL"]),
            Sale.net_amount == amount,
        )
    )
    return (result.scalar_one() or 0) > 0


async def _prior_same_pattern_count(db: AsyncSession, merchant_id: str, classification: str) -> int:
    result = await db.execute(
        select(func.count(TaxClassification.id)).where(
            TaxClassification.merchant_id == merchant_id,
            TaxClassification.classification == classification,
            TaxClassification.classified_by == "ai",
        )
    )
    return result.scalar_one() or 0


async def _active_rule_for_merchant(db: AsyncSession, merchant_id: str) -> TaxRuleVersion | None:
    merchant = await db.get(Merchant, merchant_id)
    if merchant is None:
        return None
    return await tax_rules_service.retrieve_tax_rules(
        db, merchant.business_type or "", merchant.business_category or ""
    )


@traced_tool
async def classify_revenue_category(transaction: JSONDict) -> JSONDict:
    """Classify a transaction's revenue category (revenue, internal_transfer,
    loan, purchase_payment, other) and persist the AI classification.

    `transaction` carries the fields already available from
    `get_bank_transactions` — at minimum `id`/`transaction_id`,
    `merchant_id`, `amount`, `sender_name`, `raw_note`.
    """

    transaction_id = transaction.get("id") or transaction.get("transaction_id")
    merchant_id = str(transaction.get("merchant_id"))
    amount = Decimal(str(transaction.get("amount", "0")))
    sender_name = transaction.get("sender_name")
    raw_note = transaction.get("raw_note")

    async with AsyncSessionLocal() as db:
        amount_matches = await _amount_matches_outstanding_sale(db, merchant_id, amount)

        provisional = classify_revenue(
            sender_name=sender_name,
            raw_note=raw_note,
            amount_matches_outstanding_sale=amount_matches,
        )
        prior_count = await _prior_same_pattern_count(db, merchant_id, provisional.classification)
        result = classify_revenue(
            sender_name=sender_name,
            raw_note=raw_note,
            amount_matches_outstanding_sale=amount_matches,
            prior_same_pattern_count=prior_count,
        )

        active_rule = await _active_rule_for_merchant(db, merchant_id)
        rule_version = active_rule.version if active_rule else None

        if transaction_id is not None:
            db.add(
                TaxClassification(
                    merchant_id=merchant_id,
                    transaction_id=str(transaction_id),
                    classification=result.classification,
                    classified_by="ai",
                    confidence=result.confidence,
                    rule_version=rule_version,
                )
            )
            await db.commit()

    return {
        "transaction_id": transaction_id,
        "merchant_id": merchant_id,
        "classification": result.classification,
        "confidence": float(result.confidence),
        "reasoning": list(result.reasoning),
    }


@traced_tool
async def check_required_fields(merchant_id: str, period: str) -> JSONDict:
    """Check required tax-readiness fields for a merchant/period."""

    async with AsyncSessionLocal() as db:
        result = await tax_rules_service.check_required_fields(db, merchant_id, period)
        return {
            "merchant_id": result.merchant_id,
            "period": result.period,
            "rule_version": result.rule_version,
            "all_pass": result.all_pass,
            "missing_invoice_sales": list(result.missing_invoice_sales),
            "checks": [
                {
                    "field": check.field,
                    "value": check.value if not isinstance(check.value, Decimal) else str(check.value),
                    "threshold": check.threshold,
                    "passed": check.passed,
                    "detail": check.detail,
                }
                for check in result.checks
            ],
        }


@traced_tool
async def generate_tax_readiness_report(
    merchant_id: str, period: str, rule_version: str
) -> TaxReadinessReport:
    """Assemble the full tax-readiness checklist (compliance.md's 5 items):
    bank reconciliation rate, cash session closure, unclassified
    transactions, missing invoices, and rule version validity."""

    start, end = _period_bounds(period)
    async with AsyncSessionLocal() as db:
        validation = await tax_rules_service.validate_rule_version(db, rule_version)
        required = await tax_rules_service.check_required_fields(
            db, merchant_id, period, rule_version=rule_version
        )

        tx_count = await db.scalar(
            select(func.count(BankTransaction.id)).where(
                BankTransaction.merchant_id == merchant_id,
                BankTransaction.transaction_date >= start,
                BankTransaction.transaction_date < end,
            )
        ) or 0

        tx_ids_result = await db.execute(
            select(BankTransaction.id).where(
                BankTransaction.merchant_id == merchant_id,
                BankTransaction.transaction_date >= start,
                BankTransaction.transaction_date < end,
            )
        )
        tx_ids = [row[0] for row in tx_ids_result.all()]

        matched_count = 0
        if tx_ids:
            matched_count = await db.scalar(
                select(func.count(func.distinct(PaymentAllocation.bank_transaction_id))).where(
                    PaymentAllocation.bank_transaction_id.in_(tx_ids)
                )
            ) or 0

        classified_count = 0
        if tx_ids:
            classified_count = await db.scalar(
                select(func.count(func.distinct(TaxClassification.transaction_id))).where(
                    TaxClassification.transaction_id.in_(tx_ids)
                )
            ) or 0
        unclassified_count = max(tx_count - classified_count, 0)

        store_ids_subq = select(Store.id).where(Store.merchant_id == merchant_id)
        cash_result = await db.execute(
            select(CashSession).where(
                CashSession.store_id.in_(store_ids_subq),
                CashSession.opened_at >= start,
                CashSession.opened_at < end,
            )
        )
        cash_sessions = cash_result.scalars().all()
        cash_closure_rate = (
            sum(1 for session in cash_sessions if session.status == "RECONCILED") / len(cash_sessions)
            if cash_sessions
            else 1.0
        )

        bank_reconciliation_rate = (matched_count / tx_count) if tx_count else 0.0
        missing_invoice_count = len(required.missing_invoice_sales)

        checklist = [
            {
                "item": "bank_reconciliation",
                "value": round(bank_reconciliation_rate, 4),
                "threshold": 0.95,
                "pass": bank_reconciliation_rate >= 0.95,
            },
            {
                "item": "cash_session_closure",
                "value": round(cash_closure_rate, 4),
                "threshold": 1.0,
                "pass": cash_closure_rate >= 1.0,
            },
            {
                "item": "unclassified_transactions",
                "value": unclassified_count,
                "threshold": 0,
                "pass": unclassified_count == 0,
            },
            {
                "item": "missing_invoices",
                "value": missing_invoice_count,
                "threshold": 0,
                "pass": missing_invoice_count == 0,
            },
            {
                "item": "rule_version_valid",
                "value": validation.approval_status,
                "threshold": "APPROVED",
                "pass": validation.valid,
            },
        ]
        ready = all(item["pass"] for item in checklist)

        return TaxReadinessReport(
            rule_version=rule_version,
            checklist=checklist,
            ready=ready,
            report={
                "merchant_id": merchant_id,
                "period": period,
                "effective_from": validation.effective_from.isoformat() if validation.effective_from else None,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
        )


@traced_tool
async def create_draft_export(
    merchant_id: str,
    period: str,
    rule_version: str,
    export_format: Literal["json", "csv"] = "json",
) -> ToolCallResult:
    """Create a draft export for accounting/tax handoff.

    Per compliance.md, this is only available once tax-readiness passes
    (ERR-TAX-002 otherwise) and always excludes unresolved exceptions —
    it is never a real tax filing.
    """

    readiness = await generate_tax_readiness_report(merchant_id, period, rule_version)
    if not readiness.ready:
        return ToolCallResult(
            tool_name="create_draft_export",
            output={"checklist": readiness.checklist},
            rule_version=rule_version,
            error="ERR-TAX-002: data not ready for export — unresolved tax-readiness items remain",
        )

    async with AsyncSessionLocal() as db:
        data = await export_service.collect_draft_export_data(db, merchant_id, period, rule_version)

    content: dict[str, Any] | str
    if export_format == "csv":
        content = export_service.to_csv_text(data)
    else:
        content = export_service.to_json_dict(data)

    return ToolCallResult(tool_name="create_draft_export", output=content, rule_version=rule_version)


# ---------------------------------------------------------------------------
# Merchant operations tools
# ---------------------------------------------------------------------------


def _case_id_for(merchant_id: str, period: str) -> str:
    return f"CASE-{merchant_id}-{period}"


@traced_tool
async def create_case(
    merchant_id: str, period: str, exception_ids: list[str] | None = None
) -> JSONDict:
    """Open (or return the existing) case for a merchant/period, optionally
    re-parenting already-created exceptions onto it."""

    case_id = _case_id_for(merchant_id, period)
    async with AsyncSessionLocal() as db:
        case = await db.get(ReconciliationCase, case_id)
        created = case is None
        if case is None:
            case = ReconciliationCase(
                id=case_id, merchant_id=merchant_id, period=period, status="OPEN"
            )
            db.add(case)
            await db.flush()

        if exception_ids:
            numeric_ids = [int(exception_id) for exception_id in exception_ids]
            result = await db.execute(
                select(ExceptionRecord).where(ExceptionRecord.id.in_(numeric_ids))
            )
            for record in result.scalars().all():
                record.case_id = case_id

        await db.commit()

        exception_count = await db.scalar(
            select(func.count(ExceptionRecord.id)).where(ExceptionRecord.case_id == case_id)
        ) or 0

        return {
            "id": case.id,
            "merchant_id": case.merchant_id,
            "period": case.period,
            "status": case.status,
            "priority": case.priority,
            "created": created,
            "exception_count": exception_count,
        }


@traced_tool
async def assign_task_to_rm(case_id: str, rm_user_id: str) -> JSONDict:
    """Assign a case to a relationship manager."""

    async with AsyncSessionLocal() as db:
        case = await db.get(ReconciliationCase, case_id)
        if case is None:
            return {"error": {"code": "ERR-CASE-001", "message": f"case {case_id} not found"}}

        rm_user = await db.get(User, rm_user_id)
        if rm_user is None:
            return {"error": {"code": "ERR-CASE-001", "message": f"user {rm_user_id} not found"}}

        case.assigned_rm_id = rm_user_id
        if case.status == "OPEN":
            case.status = "WAITING_FOR_CONFIRMATION"
        await db.commit()

        return {"case_id": case.id, "assigned_rm_id": rm_user_id, "status": case.status}


def _draft_message_body(
    *,
    merchant_name: str,
    exceptions: list[ExceptionRecord],
    tone: Literal["polite", "formal", "urgent"],
    confirmation_token: str | None,
) -> str:
    greeting = {
        "polite": f"{merchant_name} thân mến,",
        "formal": f"Kính gửi {merchant_name},",
        "urgent": f"{merchant_name} ơi,",
    }[tone]

    lines = [greeting, "SHB cần xác nhận một số giao dịch chưa rõ trong kỳ này:"]
    for record in exceptions:
        suggestion = record.ai_suggestion or {}
        suggested_type = suggestion.get("classification") or suggestion.get("suggested_type")
        reason = suggestion.get("reason", "")
        detail = f"- {record.exception_type}"
        if suggested_type:
            detail += f" (gợi ý: {suggested_type})"
        if reason:
            detail += f": {reason}"
        lines.append(detail)
    if confirmation_token:
        lines.append(
            "Anh/chị vui lòng xác nhận trong vòng 7 ngày qua đường link: "
            f"https://taxlens.shb.com.vn/confirm/{confirmation_token}"
        )
    return "\n".join(lines)


@traced_tool
async def draft_merchant_message(
    case_id: str,
    merchant_id: str,
    period: str,
    tone: Literal["polite", "formal", "urgent"] = "polite",
) -> MerchantMessageDraft:
    """Draft a Vietnamese confirmation-request message for a case's pending
    exceptions, embedding a signed confirmation link for the first one.

    Always requires RM review before sending (`requires_rm_review=True`) —
    see `send_confirmation_request`, which is a distinct, explicit action.
    """

    async with AsyncSessionLocal() as db:
        exceptions_result = await db.execute(
            select(ExceptionRecord).where(
                ExceptionRecord.case_id == case_id, ExceptionRecord.status == "PENDING"
            )
        )
        exceptions = exceptions_result.scalars().all()
        merchant = await db.get(Merchant, merchant_id)
        merchant_name = merchant.name if merchant else merchant_id

    token = generate_confirmation_token(exceptions[0].id) if exceptions else None
    message = _draft_message_body(
        merchant_name=merchant_name, exceptions=exceptions, tone=tone, confirmation_token=token
    )

    return MerchantMessageDraft(
        case_id=case_id,
        merchant_id=merchant_id,
        period=period,
        message=message,
        requires_rm_review=True,
    )


@traced_tool
async def send_confirmation_request(token: str, message: str) -> JSONDict:
    """Send (simulated) a merchant confirmation request for a previously
    drafted token. Validates the token — does not mint one; see
    `draft_merchant_message`."""

    try:
        decoded = decode_confirmation_token(token)
    except InvalidConfirmationToken as exc:
        return {"error": {"code": "ERR-TOKEN-001", "message": str(exc)}}

    async with AsyncSessionLocal() as db:
        record = await db.get(ExceptionRecord, decoded.exception_id)
        if record is None:
            return {"error": {"code": "ERR-TOKEN-001", "message": "exception not found"}}

    return {
        "status": "SENT",
        "exception_id": decoded.exception_id,
        "expires_at": datetime.fromtimestamp(decoded.expires_at, tz=timezone.utc).isoformat(),
        "message_length": len(message),
    }


@traced_tool
async def update_case_status(case_id: str, status: str) -> JSONDict:
    """Update a case's status."""

    allowed = {"OPEN", "WAITING_FOR_CONFIRMATION", "RESOLVED", "CLOSED"}
    if status not in allowed:
        return {"error": {"code": "ERR-GEN-001", "message": f"invalid status {status!r}"}}

    async with AsyncSessionLocal() as db:
        case = await db.get(ReconciliationCase, case_id)
        if case is None:
            return {"error": {"code": "ERR-CASE-001", "message": f"case {case_id} not found"}}
        case.status = status
        await db.commit()
        return {"case_id": case.id, "status": case.status}


@traced_tool
async def export_to_accounting_system(
    merchant_id: str,
    period: str,
    export_format: Literal["json", "csv"] = "json",
) -> ToolCallResult:
    """Export cleaned reconciled data to a MISA-compatible mock format.

    Unlike `create_draft_export`, not gated on the full tax-readiness
    checklist — this is a practical accounting handoff action, not the
    compliance-tied draft tax export.
    """

    async with AsyncSessionLocal() as db:
        active_rule = await _active_rule_for_merchant(db, merchant_id)
        rule_version = active_rule.version if active_rule else "unknown"
        data = await export_service.collect_draft_export_data(db, merchant_id, period, rule_version)

    content: dict[str, Any] | str
    if export_format == "csv":
        content = export_service.to_misa_csv_text(data)
    else:
        content = export_service.to_json_dict(data)

    return ToolCallResult(tool_name="export_to_accounting_system", output=content, rule_version=rule_version)


__all__ = [
    "JSONDict",
    "JSONList",
    "JSONValue",
    "get_bank_transactions",
    "get_sales_orders",
    "get_cash_sessions",
    "get_invoices",
    "find_payment_reference",
    "score_match_candidates",
    "create_reconciliation_exception",
    "retrieve_tax_rules",
    "validate_rule_version",
    "classify_revenue_category",
    "check_required_fields",
    "generate_tax_readiness_report",
    "create_draft_export",
    "create_case",
    "assign_task_to_rm",
    "draft_merchant_message",
    "send_confirmation_request",
    "update_case_status",
    "export_to_accounting_system",
]
