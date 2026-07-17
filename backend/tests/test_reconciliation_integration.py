"""P1 Phase 2 reconciliation tests against the dedicated 25/5 truth set."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import PaymentAllocation, PaymentIntent
from app.models.reconciliation import ExceptionRecord
from app.models.sale import Sale
from app.services.allocation import (
    AllocationLeg,
    AllocationValidationError,
    allocate_payment,
)
from app.services.matching import (
    BankTransaction as DomainBankTransaction,
    PaymentStatus,
    Sale as DomainSale,
)
from app.services.reconciliation import (
    ReconciliationIntegrationError,
    persist_allocation_plan,
    persist_match_decision,
    reconcile_period,
    score_transaction_candidates,
)
from app.tools.reconciliation import (
    create_reconciliation_exception,
    find_payment_reference,
    score_match_candidates,
)
from tests.p1_db_fixtures import P1TruthSet


async def test_truth_set_has_25_matches_5_exceptions_and_zero_false_matches(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    summary = await reconcile_period(
        p1_db_session,
        case_id=p1_truth_set.case_id,
        merchant_id=p1_truth_set.merchant_id,
        period=p1_truth_set.period,
    )

    assert summary.transactions_scanned == 29
    assert summary.matched == 25
    assert summary.exceptions == 5
    assert summary.ambiguous == 2
    assert summary.no_match == 2
    assert summary.review_required == 0
    assert summary.cash_discrepancies == 1

    bank_allocations = tuple(
        (
            await p1_db_session.scalars(
                select(PaymentAllocation).where(
                    PaymentAllocation.bank_transaction_id.is_not(None)
                )
            )
        ).all()
    )
    actual_matches = {
        row.bank_transaction_id: row.sale_id for row in bank_allocations
    }
    assert actual_matches == p1_truth_set.exact_matches
    assert sum(
        actual_matches[transaction_id] != sale_id
        for transaction_id, sale_id in p1_truth_set.exact_matches.items()
    ) == 0

    exceptions = tuple(
        (
            await p1_db_session.scalars(
                select(ExceptionRecord).where(
                    ExceptionRecord.case_id == p1_truth_set.case_id
                )
            )
        ).all()
    )
    assert Counter(row.exception_type for row in exceptions) == {
        "AMBIGUOUS_MATCH": 2,
        "NO_MATCH": 2,
        "CASH_DISCREPANCY": 1,
    }

    sale_statuses = dict(
        (
            await p1_db_session.execute(
                select(Sale.id, Sale.payment_status).where(
                    Sale.id.in_(p1_truth_set.exact_matches.values())
                )
            )
        ).all()
    )
    assert set(sale_statuses.values()) == {"PAID"}
    intent_statuses = tuple(
        (
            await p1_db_session.scalars(
                select(PaymentIntent.status).where(
                    PaymentIntent.merchant_id == p1_truth_set.merchant_id
                )
            )
        ).all()
    )
    assert set(intent_statuses) == {"PAID"}


async def test_period_reconciliation_is_idempotent(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    first = await reconcile_period(
        p1_db_session,
        case_id=p1_truth_set.case_id,
        merchant_id=p1_truth_set.merchant_id,
        period=p1_truth_set.period,
    )
    second = await reconcile_period(
        p1_db_session,
        case_id=p1_truth_set.case_id,
        merchant_id=p1_truth_set.merchant_id,
        period=p1_truth_set.period,
    )

    allocations = tuple(
        (
            await p1_db_session.scalars(
                select(PaymentAllocation).where(
                    PaymentAllocation.bank_transaction_id.is_not(None)
                )
            )
        ).all()
    )
    exceptions = tuple(
        (
            await p1_db_session.scalars(
                select(ExceptionRecord).where(
                    ExceptionRecord.case_id == p1_truth_set.case_id
                )
            )
        ).all()
    )
    assert first.matched == second.matched == 25
    assert first.exceptions == second.exceptions == 5
    assert len(allocations) == 25
    assert len(exceptions) == 5
    assert first.exception_ids == second.exception_ids


async def test_score_tool_uses_canonical_transaction_id_and_exposes_reasoning(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    candidates = await score_match_candidates(
        p1_db_session,
        p1_truth_set.ambiguous_transaction_ids[0],
    )

    assert len(candidates) == 2
    assert candidates[0].transaction_id == p1_truth_set.ambiguous_transaction_ids[0]
    assert candidates[0].action == "HUMAN_CONFIRM"
    assert candidates[0].deterministic_score == 40
    assert candidates[0].confidence_method == "heuristic_v1"
    assert "UNRESOLVED_DUPLICATE_AMOUNT" in candidates[0].reason_codes
    assert any(
        factor["name"] == "duplicate_amount"
        for factor in candidates[0].factor_breakdown
    )


async def test_find_payment_reference_requires_valid_canonical_code(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    found = await find_payment_reference(p1_db_session, "pay-a00001")
    invalid = await find_payment_reference(p1_db_session, "A00001")

    assert found is not None
    assert found["payment_intent_id"] == "PAY-A00001"
    assert found["sale_id"] == p1_truth_set.exact_matches["P1-TX-001"]
    assert invalid is None


async def test_exception_tool_is_idempotent_and_uses_existing_case(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    first = await create_reconciliation_exception(
        p1_db_session,
        p1_truth_set.case_id,
        p1_truth_set.merchant_id,
        p1_truth_set.period,
        "TOOL_TEST",
        "same reason",
        transaction_id=p1_truth_set.no_match_transaction_ids[0],
    )
    second = await create_reconciliation_exception(
        p1_db_session,
        p1_truth_set.case_id,
        p1_truth_set.merchant_id,
        p1_truth_set.period,
        "TOOL_TEST",
        "same reason",
        transaction_id=p1_truth_set.no_match_transaction_ids[0],
    )

    assert first.ai_suggestion["created"] is True
    assert second.ai_suggestion["created"] is False
    assert first.ai_suggestion["record_id"] == second.ai_suggestion["record_id"]


async def test_exception_tool_rejects_case_scope_mismatch(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    with pytest.raises(ReconciliationIntegrationError) as error:
        await create_reconciliation_exception(
            p1_db_session,
            p1_truth_set.case_id,
            "WRONG-MERCHANT",
            p1_truth_set.period,
            "TOOL_TEST",
            "must fail",
        )

    assert error.value.code == "CASE_SCOPE_MISMATCH"


async def test_fuzzy_confidence_is_not_persisted_without_method_column(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    sale_time = datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc)
    sale = Sale(
        id="P1-FUZZY-SALE",
        merchant_id=p1_truth_set.merchant_id,
        store_id=p1_truth_set.store_id,
        gross_amount=Decimal("650000"),
        discount=Decimal("0"),
        net_amount=Decimal("650000"),
        payment_status="UNPAID",
        invoice_status="PENDING",
        created_at=sale_time,
        updated_at=sale_time,
    )
    from app.models.transaction import BankTransaction

    transaction = BankTransaction(
        id="P1-TX-FUZZY",
        merchant_id=p1_truth_set.merchant_id,
        amount=Decimal("650000"),
        sender_name="Known Sender",
        raw_note="payment P1-FUZZY-SALE",
        transaction_type="in",
        source="p1_fixture",
        source_id="fuzzy",
        ingested_at=sale_time + timedelta(seconds=30),
        transaction_date=sale_time + timedelta(seconds=30),
    )
    p1_db_session.add_all([sale, transaction])
    await p1_db_session.flush()

    candidates = await score_transaction_candidates(
        p1_db_session,
        transaction.id,
        known_sender_names=("known sender",),
    )
    assert candidates[0].action.value == "AUTO_MATCH"
    assert candidates[0].confidence_method == "heuristic_v1"
    assert candidates[0].confidence == Decimal("1.00")

    await persist_match_decision(p1_db_session, candidates[0], transaction.id)
    allocation = await p1_db_session.scalar(
        select(PaymentAllocation).where(
            PaymentAllocation.bank_transaction_id == transaction.id
        )
    )
    assert allocation.match_method == "FUZZY"
    assert allocation.confidence is None


async def test_persistence_revalidates_stale_sale_balance_atomically(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    sale_time = datetime(2026, 7, 15, 9, 0, tzinfo=timezone.utc)
    sale_row = Sale(
        id="P1-STALE-SALE",
        merchant_id=p1_truth_set.merchant_id,
        store_id=p1_truth_set.store_id,
        gross_amount=Decimal("500000"),
        discount=Decimal("0"),
        net_amount=Decimal("500000"),
        payment_status="UNPAID",
        invoice_status="PENDING",
        created_at=sale_time,
        updated_at=sale_time,
    )
    from app.models.transaction import BankTransaction

    transaction_row = BankTransaction(
        id="P1-TX-STALE",
        merchant_id=p1_truth_set.merchant_id,
        amount=Decimal("500000"),
        transaction_type="in",
        source="p1_fixture",
        source_id="stale",
        ingested_at=sale_time,
        transaction_date=sale_time,
    )
    p1_db_session.add_all([sale_row, transaction_row])
    await p1_db_session.flush()

    plan = allocate_payment(
        DomainBankTransaction(
            id=transaction_row.id,
            merchant_id=p1_truth_set.merchant_id,
            amount=Decimal("500000"),
            transaction_date=sale_time,
        ),
        (AllocationLeg(sale_id=sale_row.id, amount=Decimal("500000")),),
        (
            DomainSale(
                id=sale_row.id,
                merchant_id=p1_truth_set.merchant_id,
                store_id=p1_truth_set.store_id,
                net_amount=Decimal("500000"),
                created_at=sale_time,
                payment_status=PaymentStatus.UNPAID,
            ),
        ),
    )

    p1_db_session.add(
        PaymentAllocation(
            bank_transaction_id=None,
            sale_id=sale_row.id,
            amount=Decimal("100000"),
            allocation_type="PAYMENT",
            match_method="MANUAL",
            created_at=sale_time,
        )
    )
    sale_row.payment_status = "PARTIAL"
    await p1_db_session.flush()

    with pytest.raises(AllocationValidationError) as error:
        await persist_allocation_plan(p1_db_session, plan)

    assert error.value.code == "SALE_OVER_ALLOCATION"
    persisted = await p1_db_session.scalar(
        select(PaymentAllocation).where(
            PaymentAllocation.bank_transaction_id == transaction_row.id
        )
    )
    assert persisted is None


async def test_referenced_refund_creates_negative_allocation(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    from app.models.transaction import BankTransaction

    payment_time = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
    sale = Sale(
        id="P1-REFUND-SALE",
        merchant_id=p1_truth_set.merchant_id,
        store_id=p1_truth_set.store_id,
        gross_amount=Decimal("300000"),
        discount=Decimal("0"),
        net_amount=Decimal("300000"),
        payment_status="PAID",
        invoice_status="PENDING",
        created_at=payment_time,
        updated_at=payment_time,
    )
    intent = PaymentIntent(
        id="PAY-R00001",
        sale_id=sale.id,
        merchant_id=p1_truth_set.merchant_id,
        amount=Decimal("300000"),
        status="PAID",
        expires_at=payment_time + timedelta(hours=1),
        created_at=payment_time,
    )
    original = BankTransaction(
        id="P1-TX-REF-ORIG",
        merchant_id=p1_truth_set.merchant_id,
        amount=Decimal("300000"),
        payment_code=intent.id,
        transaction_type="in",
        source="p1_fixture",
        source_id="refund-original",
        ingested_at=payment_time,
        transaction_date=payment_time,
    )
    refund = BankTransaction(
        id="P1-TX-REFUND",
        merchant_id=p1_truth_set.merchant_id,
        amount=Decimal("300000"),
        payment_code=intent.id,
        raw_note=f"refund {intent.id}",
        transaction_type="out",
        source="p1_fixture",
        source_id="refund",
        ingested_at=payment_time + timedelta(days=1),
        transaction_date=payment_time + timedelta(days=1),
    )
    p1_db_session.add_all([sale, intent, original, refund])
    await p1_db_session.flush()
    p1_db_session.add(
        PaymentAllocation(
            bank_transaction_id=original.id,
            payment_intent_id=intent.id,
            sale_id=sale.id,
            amount=Decimal("300000"),
            allocation_type="PAYMENT",
            match_method="EXACT",
            confidence=Decimal("1"),
            created_at=payment_time,
        )
    )
    await p1_db_session.flush()

    summary = await reconcile_period(
        p1_db_session,
        case_id=p1_truth_set.case_id,
        merchant_id=p1_truth_set.merchant_id,
        period=p1_truth_set.period,
    )
    refund_allocation = await p1_db_session.scalar(
        select(PaymentAllocation).where(
            PaymentAllocation.bank_transaction_id == refund.id
        )
    )

    assert summary.matched == 27
    assert summary.exceptions == 5
    assert refund_allocation.amount == Decimal("-300000")
    assert refund_allocation.allocation_type == "REFUND"
    assert sale.payment_status == "REFUNDED"


async def test_unrefenced_refund_creates_review_not_no_match(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    from app.models.transaction import BankTransaction

    refund_time = datetime(2026, 7, 16, 12, 0, tzinfo=timezone.utc)
    refund = BankTransaction(
        id="P1-TX-REF-MANUAL",
        merchant_id=p1_truth_set.merchant_id,
        amount=Decimal("100000"),
        raw_note="refund without payment reference",
        transaction_type="out",
        source="p1_fixture",
        source_id="manual-refund",
        ingested_at=refund_time,
        transaction_date=refund_time,
    )
    p1_db_session.add(refund)
    await p1_db_session.flush()

    summary = await reconcile_period(
        p1_db_session,
        case_id=p1_truth_set.case_id,
        merchant_id=p1_truth_set.merchant_id,
        period=p1_truth_set.period,
    )
    exception = await p1_db_session.scalar(
        select(ExceptionRecord).where(
            ExceptionRecord.bank_transaction_id == refund.id
        )
    )

    assert summary.matched == 25
    assert summary.exceptions == 6
    assert summary.no_match == 2
    assert summary.review_required == 1
    assert exception.exception_type == "REFUND_REVIEW"
