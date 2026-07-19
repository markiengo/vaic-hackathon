from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.payment import PaymentAllocation
from app.models.transaction import BankTransaction

router = APIRouter(prefix="/transactions", tags=["transactions"])


# TODO Q-A1: path is /transactions; API spec §3 uses /merchants/{id}/transactions.
# Keep current path until P3 alignment confirmed.
@router.get("")
async def list_transactions(
    merchant_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM"),
    status: str | None = Query(None, description="Filter: matched|unmatched|pending|all"),
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

    # Fetch all PaymentAllocation rows for these transactions
    tx_ids = [r.id for r in rows]
    allocation_map: dict[str, dict] = {}
    if tx_ids:
        alloc_result = await db.execute(
            select(
                PaymentAllocation.bank_transaction_id,
                PaymentAllocation.sale_id,
                PaymentAllocation.match_method,
                PaymentAllocation.confidence,
            ).where(PaymentAllocation.bank_transaction_id.in_(tx_ids))
        )
        for bank_tx_id, sale_id, match_method, confidence in alloc_result:
            allocation_map[bank_tx_id] = {
                "sale_id": sale_id,
                "match_method": match_method,
                "confidence": float(confidence) if confidence else None,
            }

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
            "match_status": "matched" if r.id in allocation_map else None,
            "matched_sale_id": allocation_map.get(r.id, {}).get("sale_id"),
            "match_method": allocation_map.get(r.id, {}).get("match_method"),
            "match_confidence": allocation_map.get(r.id, {}).get("confidence"),
            "ai_interpretation": r.ai_interpretation,
        }
        for r in rows
    ]
    # Filter by match_status
    if status and status != "all":
        if status == "matched":
            transactions = [t for t in transactions if t["match_status"] is not None]
        elif status in ("unmatched", "pending"):
            transactions = [t for t in transactions if t["match_status"] is None]

    return {"transactions": transactions, "total": len(transactions)}
