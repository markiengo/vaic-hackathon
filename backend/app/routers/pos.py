from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.product import Product
from app.models.cash import CashSession

router = APIRouter(prefix="/pos", tags=["pos"])


@router.get("/products")
async def list_products(
    merchant_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Product)
        .where(Product.merchant_id == merchant_id, Product.is_active == True)
        .order_by(Product.name.asc())
    )
    products = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "price": float(p.price) if p.price else 0,
            "is_service": p.is_service,
        }
        for p in products
    ]


@router.get("/cash-session")
async def get_active_cash_session(
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(CashSession).where(CashSession.status == "OPEN").order_by(CashSession.opened_at.desc()).limit(1)
    )
    s = result.scalars().first()
    if not s:
        return {"status": "no active session"}
    return {
        "id": s.id,
        "opening_cash": float(s.opening_cash) if s.opening_cash else 0,
        "expected_cash": float(s.expected_cash) if s.expected_cash else None,
        "counted_cash": float(s.counted_cash) if s.counted_cash else None,
        "discrepancy": float(s.discrepancy) if s.discrepancy else None,
        "status": s.status,
        "opened_at": s.opened_at.isoformat() if s.opened_at else None,
        "closed_at": s.closed_at.isoformat() if s.closed_at else None,
    }
