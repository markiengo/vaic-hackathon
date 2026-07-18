from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.invoice import Invoice

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("")
async def list_invoices(
    merchant_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM"),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    if int(month) == 12:
        period_end = date(int(year) + 1, 1, 1)
    else:
        period_end = date(int(year), int(month) + 1, 1)

    q = (
        select(Invoice)
        .where(
            Invoice.merchant_id == merchant_id,
            Invoice.invoice_date >= period_start,
            Invoice.invoice_date < period_end,
        )
        .order_by(Invoice.invoice_date.desc())
    )
    if status:
        q = q.where(Invoice.status == status)

    result = await db.execute(q)
    invoices = result.scalars().all()
    return {
        "invoices": [
            {
                "id": inv.id,
                "sale_id": inv.sale_id,
                "merchant_id": inv.merchant_id,
                "invoice_number": inv.invoice_number,
                "amount": float(inv.amount) if inv.amount else 0,
                "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
                "status": inv.status,
                "source": inv.source,
                "source_id": inv.source_id,
                "ingested_at": inv.ingested_at.isoformat() if inv.ingested_at else None,
            }
            for inv in invoices
        ],
        "total": len(invoices),
    }
