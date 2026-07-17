from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.agent import AgentRun, ToolCall

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/runs")
async def list_runs(
    merchant_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(AgentRun)
        .where(AgentRun.merchant_id == merchant_id)
        .order_by(AgentRun.started_at.desc())
    )
    runs = result.scalars().all()
    return [
        {
            "id": r.id,
            "case_id": r.case_id,
            "merchant_id": r.merchant_id,
            "request_text": r.request_text,
            "plan": r.plan,
            "status": r.status,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "error": r.error,
        }
        for r in runs
    ]


@router.get("/runs/{run_id}/trace")
async def get_trace(run_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    run_result = await db.execute(
        select(AgentRun).where(AgentRun.id == run_id)
    )
    run = run_result.scalars().first()
    if not run:
        return {"error": "not found"}

    calls_result = await db.execute(
        select(ToolCall)
        .where(ToolCall.agent_run_id == run_id)
        .order_by(ToolCall.called_at.asc())
    )
    calls = calls_result.scalars().all()
    return {
        "run": {
            "id": run.id,
            "case_id": run.case_id,
            "merchant_id": run.merchant_id,
            "request_text": run.request_text,
            "plan": run.plan,
            "status": run.status,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "error": run.error,
        },
        "steps": [
            {
                "id": c.id,
                "agent": c.agent_name,
                "tool": c.tool_name,
                "confidence": float(c.confidence) if c.confidence else None,
                "rule_version": c.rule_version,
                "called_at": c.called_at.isoformat() if c.called_at else None,
                "duration_ms": c.duration_ms,
            }
            for c in calls
        ],
    }
