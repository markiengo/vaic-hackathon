from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.core.database import get_db
from app.models.sale import Sale, SaleLine

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("")
async def list_sales(
    merchant_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    if int(month) == 12:
        period_end = date(int(year) + 1, 1, 1)
    else:
        period_end = date(int(year), int(month) + 1, 1)

    result = await db.execute(
        select(Sale)
        .where(
            Sale.merchant_id == merchant_id,
            Sale.created_at >= period_start,
            Sale.created_at < period_end,
        )
        .order_by(Sale.created_at.desc())
    )
    sales = result.scalars().all()
    return [
        {
            "id": s.id,
            "merchant_id": s.merchant_id,
            "store_id": s.store_id,
            "gross_amount": float(s.gross_amount) if s.gross_amount else 0,
            "discount": float(s.discount) if s.discount else 0,
            "net_amount": float(s.net_amount) if s.net_amount else 0,
            "payment_status": s.payment_status,
            "invoice_status": s.invoice_status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sales
    ]
