from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.reconciliation import ReconciliationCase, ExceptionRecord

router = APIRouter(prefix="/reconciliation", tags=["reconciliation"])


@router.get("/exceptions")
async def list_exceptions(
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
        select(ExceptionRecord).where(ExceptionRecord.case_id.in_(case_ids))
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
            "human_decision": ex.human_decision,
            "status": ex.status,
            "created_at": ex.created_at.isoformat() if ex.created_at else None,
        }
        for ex in exceptions
    ]
