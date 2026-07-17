from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.reconciliation import ReconciliationCase

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("")
async def list_cases(
    merchant_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    q = select(ReconciliationCase).order_by(ReconciliationCase.created_at.desc())
    if merchant_id:
        q = q.where(ReconciliationCase.merchant_id == merchant_id)
    result = await db.execute(q)
    cases = result.scalars().all()
    return [
        {
            "id": c.id,
            "merchant_id": c.merchant_id,
            "period": c.period,
            "status": c.status,
            "priority": c.priority,
            "assigned_rm_id": c.assigned_rm_id,
            "tax_rule_version": c.tax_rule_version,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in cases
    ]


@router.get("/{case_id}")
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(
        select(ReconciliationCase).where(ReconciliationCase.id == case_id)
    )
    c = result.scalars().first()
    if not c:
        return {"error": "not found"}
    return {
        "id": c.id,
        "merchant_id": c.merchant_id,
        "period": c.period,
        "status": c.status,
        "priority": c.priority,
        "assigned_rm_id": c.assigned_rm_id,
        "tax_rule_version": c.tax_rule_version,
        "human_approvals": c.human_approvals,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }
