from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.agent import AuditEvent

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_audit_events(
    merchant_id: str = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    q = select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit)
    if merchant_id:
        q = q.where(AuditEvent.merchant_id == merchant_id)
    result = await db.execute(q)
    events = result.scalars().all()
    return [
        {
            "id": e.id,
            "actor_type": e.actor_type,
            "actor_id": e.actor_id,
            "agent_name": e.agent_name,
            "action": e.action,
            "tool_name": e.tool_name,
            "confidence": float(e.confidence) if e.confidence else None,
            "rule_version": e.rule_version,
            "approval_status": e.approval_status,
            "merchant_id": e.merchant_id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        }
        for e in events
    ]
