from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.core.database import get_db
from app.models.transaction import BankTransaction
from app.models.sale import Sale
from app.models.invoice import Invoice

router = APIRouter(prefix="/merchants", tags=["merchants"])


@router.get("/{merchant_id}/dashboard")
async def dashboard(
    merchant_id: str,
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    if int(month) == 12:
        period_end = date(int(year) + 1, 1, 1)
    else:
        period_end = date(int(year), int(month) + 1, 1)

    tx_count = await db.scalar(
        select(func.count(BankTransaction.id)).where(
            BankTransaction.merchant_id == merchant_id,
            BankTransaction.transaction_date >= period_start,
            BankTransaction.transaction_date < period_end,
        )
    )
    sale_count = await db.scalar(
        select(func.count(Sale.id)).where(
            Sale.merchant_id == merchant_id,
            Sale.created_at >= period_start,
            Sale.created_at < period_end,
        )
    )
    invoice_count = await db.scalar(
        select(func.count(Invoice.id)).where(
            Invoice.merchant_id == merchant_id,
            Invoice.invoice_date >= period_start,
            Invoice.invoice_date < period_end,
        )
    )

    total = (tx_count or 0) + (sale_count or 0)
    matched = min(tx_count or 0, invoice_count or 0)
    pending = max((sale_count or 0) - (invoice_count or 0), 0)
    exceptions = max(pending, 0)
    rate = round((matched / total * 100), 1) if total > 0 else 0

    return {
        "total_transactions": total,
        "reconciliation_rate": rate,
        "open_exceptions": exceptions,
        "tax_ready": exceptions == 0,
        "matched": matched,
        "pending": pending,
        "exceptions": exceptions,
    }
