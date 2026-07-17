from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.reconciliation import ReconciliationCase, ExceptionRecord

router = APIRouter(prefix="/confirm", tags=["confirm"])


@router.get("/pending")
async def list_pending(
    merchant_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    case_result = await db.execute(
        select(ReconciliationCase).where(
            ReconciliationCase.merchant_id == merchant_id,
            ReconciliationCase.period == period,
        )
    )
    cases = case_result.scalars().all()
    if not cases:
        return []
    case_ids = [c.id for c in cases]
    ex_result = await db.execute(
        select(ExceptionRecord).where(
            ExceptionRecord.case_id.in_(case_ids),
            ExceptionRecord.status == "PENDING",
        )
    )
    exceptions = ex_result.scalars().all()
    return [
        {
            "id": ex.id,
            "case_id": ex.case_id,
            "bank_transaction_id": ex.bank_transaction_id,
            "sale_id": ex.sale_id,
            "exception_type": ex.exception_type,
            "ai_suggestion": ex.ai_suggestion,
            "status": ex.status,
        }
        for ex in exceptions
    ]


@router.post("/{exception_id}/approve")
async def approve(
    exception_id: int,
    decision: str = Query(..., description="APPROVED or REJECTED"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(ExceptionRecord).where(ExceptionRecord.id == exception_id)
    )
    ex = result.scalars().first()
    if not ex:
        return {"error": "not found"}
    ex.human_decision = decision
    ex.status = "RESOLVED" if decision == "APPROVED" else "REJECTED"
    await db.commit()
    return {"id": ex.id, "status": ex.status, "decision": decision}
