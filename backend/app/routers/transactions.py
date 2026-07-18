from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.transaction import BankTransaction

router = APIRouter(prefix="/transactions", tags=["transactions"])


# TODO Q-A1: path is /transactions; API spec §3 uses /merchants/{id}/transactions.
# Keep current path until P3 alignment confirmed.
@router.get("")
async def list_transactions(
    merchant_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    period_end = date(int(year) + 1, 1, 1) if int(month) == 12 else date(int(year), int(month) + 1, 1)

    result = await db.execute(
        select(BankTransaction)
        .where(
            BankTransaction.merchant_id == merchant_id,
            BankTransaction.transaction_date >= period_start,
            BankTransaction.transaction_date < period_end,
        )
        .order_by(BankTransaction.transaction_date.desc())
    )
    rows = result.scalars().all()
    transactions = [
        {
            "id": r.id,
            "merchant_id": r.merchant_id,
            "amount": float(r.amount) if r.amount else 0,
            "sender_name": r.sender_name,
            "raw_note": r.raw_note,
            "normalized_note": r.normalized_note,
            "transaction_type": r.transaction_type,
            "reference_number": r.reference_number,
            "payment_code": r.payment_code,
            "source": r.source,
            "transaction_date": r.transaction_date.isoformat() if r.transaction_date else None,
            # TODO [P1]: match_status, matched_sale_id, ai_interpretation populated by matching engine
            "match_status": None,
            "matched_sale_id": None,
            "ai_interpretation": None,
        }
        for r in rows
    ]
    return {"transactions": transactions, "total": len(transactions)}
