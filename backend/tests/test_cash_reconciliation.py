"""P1 Phase 2 tests for allocation-backed cash reconciliation."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cash import CashSession
from app.models.payment import PaymentAllocation
from app.services.cash_reconciliation import (
    CashReconciliationError,
    reconcile_cash_session,
)
from tests.p1_db_fixtures import P1TruthSet


async def _cash_session(
    session: AsyncSession, truth_set: P1TruthSet
) -> CashSession:
    return await session.scalar(
        select(CashSession).where(CashSession.id == truth_set.cash_session_id)
    )


async def test_cash_formula_detects_expected_discrepancy(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    result = await reconcile_cash_session(
        p1_db_session, p1_truth_set.cash_session_id
    )

    assert result.opening_cash == Decimal("2000000")
    assert result.cash_sales == Decimal("3200000")
    assert result.cash_expenses == Decimal("0")
    assert result.expected_cash == Decimal("5200000")
    assert result.counted_cash == Decimal("5080000")
    assert result.discrepancy == Decimal("-120000")
    assert result.new_status == "CLOSED"


async def test_zero_cash_discrepancy_marks_session_reconciled(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    cash = await _cash_session(p1_db_session, p1_truth_set)
    cash.counted_cash = Decimal("5200000")
    cash.discrepancy_reason = None

    result = await reconcile_cash_session(
        p1_db_session, p1_truth_set.cash_session_id
    )

    assert result.discrepancy == Decimal("0")
    assert result.new_status == "RECONCILED"


async def test_cash_expenses_reduce_expected_cash(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    cash = await _cash_session(p1_db_session, p1_truth_set)
    cash.cash_expenses = Decimal("200000")
    cash.counted_cash = Decimal("5000000")

    result = await reconcile_cash_session(
        p1_db_session, p1_truth_set.cash_session_id
    )

    assert result.expected_cash == Decimal("5000000")
    assert result.discrepancy == Decimal("0")


async def test_cash_refund_is_net_of_cash_sales(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    p1_db_session.add(
        PaymentAllocation(
            bank_transaction_id=None,
            sale_id="P1-CASH-01",
            amount=Decimal("-100000"),
            allocation_type="REFUND",
            match_method="MANUAL",
            created_at=datetime(2026, 7, 13, 17, 30, tzinfo=timezone.utc),
        )
    )
    cash = await _cash_session(p1_db_session, p1_truth_set)
    cash.counted_cash = Decimal("5100000")
    await p1_db_session.flush()

    result = await reconcile_cash_session(
        p1_db_session, p1_truth_set.cash_session_id
    )

    assert result.cash_sales == Decimal("3100000")
    assert result.expected_cash == Decimal("5100000")
    assert result.discrepancy == Decimal("0")


async def test_counted_cash_is_required(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    cash = await _cash_session(p1_db_session, p1_truth_set)
    cash.counted_cash = None

    with pytest.raises(CashReconciliationError) as error:
        await reconcile_cash_session(p1_db_session, p1_truth_set.cash_session_id)

    assert error.value.code == "COUNTED_CASH_REQUIRED"


async def test_nonzero_discrepancy_requires_reason(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    cash = await _cash_session(p1_db_session, p1_truth_set)
    cash.discrepancy_reason = None

    with pytest.raises(CashReconciliationError) as error:
        await reconcile_cash_session(p1_db_session, p1_truth_set.cash_session_id)

    assert error.value.code == "DISCREPANCY_REASON_REQUIRED"


async def test_counted_open_session_gets_closed_timestamp(
    p1_db_session: AsyncSession,
    p1_truth_set: P1TruthSet,
):
    cash = await _cash_session(p1_db_session, p1_truth_set)
    cash.status = "OPEN"
    cash.closed_at = None
    cash.counted_cash = Decimal("5200000")
    close_time = datetime(2026, 7, 13, 18, 0, tzinfo=timezone.utc)

    result = await reconcile_cash_session(
        p1_db_session,
        p1_truth_set.cash_session_id,
        now=close_time,
    )

    assert result.new_status == "RECONCILED"
    assert cash.closed_at == close_time.replace(tzinfo=None) or cash.closed_at == close_time
