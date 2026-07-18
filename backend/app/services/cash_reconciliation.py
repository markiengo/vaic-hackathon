"""Cash-session reconciliation backed by allocation ledger entries."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cash import CashSession
from app.models.payment import PaymentAllocation
from app.models.sale import Sale
from app.services.matching import ZERO


class CashReconciliationError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class CashReconciliationResult:
    cash_session_id: int
    opening_cash: Decimal
    cash_sales: Decimal
    cash_expenses: Decimal
    expected_cash: Decimal
    counted_cash: Decimal
    discrepancy: Decimal
    previous_status: str
    new_status: str


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def reconcile_cash_session(
    session: AsyncSession,
    cash_session_id: int,
    *,
    now: datetime | None = None,
) -> CashReconciliationResult:
    """Calculate and flush one cash-session balance without committing.

    Cash sales are allocation-ledger rows with no bank transaction.  Signed
    PAYMENT/DEPOSIT/REFUND rows therefore net naturally in the formula:
    ``opening_cash + cash_sales - cash_expenses``.
    """

    cash_session = await session.scalar(
        select(CashSession)
        .where(CashSession.id == cash_session_id)
        .with_for_update()
    )
    if cash_session is None:
        raise CashReconciliationError(
            "CASH_SESSION_NOT_FOUND",
            f"cash session {cash_session_id} was not found",
        )
    if cash_session.counted_cash is None:
        raise CashReconciliationError(
            "COUNTED_CASH_REQUIRED",
            "counted_cash is required before reconciliation",
        )

    start = _as_utc(cash_session.opened_at)
    end = _as_utc(
        cash_session.closed_at or now or datetime.now(timezone.utc)
    )
    cash_sales_value = await session.scalar(
        select(func.coalesce(func.sum(PaymentAllocation.amount), 0))
        .join(Sale, PaymentAllocation.sale_id == Sale.id)
        .where(
            PaymentAllocation.bank_transaction_id.is_(None),
            Sale.store_id == cash_session.store_id,
            PaymentAllocation.created_at >= start,
            PaymentAllocation.created_at <= end,
        )
    )
    opening_cash = Decimal(cash_session.opening_cash)
    cash_sales = Decimal(cash_sales_value or ZERO)
    cash_expenses = Decimal(cash_session.cash_expenses or ZERO)
    counted_cash = Decimal(cash_session.counted_cash)
    expected_cash = opening_cash + cash_sales - cash_expenses
    discrepancy = counted_cash - expected_cash
    if discrepancy != ZERO and not (cash_session.discrepancy_reason or "").strip():
        raise CashReconciliationError(
            "DISCREPANCY_REASON_REQUIRED",
            "a non-zero cash discrepancy requires discrepancy_reason",
        )

    previous_status = cash_session.status
    new_status = "RECONCILED" if discrepancy == ZERO else "CLOSED"
    cash_session.expected_cash = expected_cash
    cash_session.discrepancy = discrepancy
    cash_session.status = new_status
    if cash_session.closed_at is None:
        cash_session.closed_at = end
    await session.flush()

    return CashReconciliationResult(
        cash_session_id=cash_session.id,
        opening_cash=opening_cash,
        cash_sales=cash_sales,
        cash_expenses=cash_expenses,
        expected_cash=expected_cash,
        counted_cash=counted_cash,
        discrepancy=discrepancy,
        previous_status=previous_status,
        new_status=new_status,
    )
