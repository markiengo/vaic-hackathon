import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, get_current_user
from app.models.agent import AgentRun, ToolCall

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentRunStartRequest(BaseModel):
    """P3's api.ts shape: {merchant_id, period, request}.
    'request' maps to request_text on AgentRun."""
    merchant_id: str
    period: str
    request: str
    case_id: str | None = None


async def _dispatch_agent_run(run_id: str) -> None:
    """Background task — placeholder until P2 wires LangGraph workflow."""
    pass


# TODO Q-D: path is /agents/run (singular) per P3's api.ts; API spec §8 uses
# /agents/run as well. Confirm with P3 before changing — path must not diverge.
@router.post("/run", status_code=202)
async def start_agent_run(
    body: AgentRunStartRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> JSONResponse:
    run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    run = AgentRun(
        id=run_id,
        merchant_id=body.merchant_id,
        user_id=current_user.id,
        request_text=body.request,
        case_id=body.case_id,
        status="PLANNING",
    )
    db.add(run)
    await db.commit()

    background_tasks.add_task(_dispatch_agent_run, run_id)

    return JSONResponse(status_code=202, content={"run_id": run_id, "status": "PLANNING"})


@router.get("/runs")
async def list_runs(
    merchant_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
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


@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    run = await db.get(AgentRun, run_id)
    if run is None:
        raise TaxLensError("ERR-RUN-001", 404, "Agent run không tồn tại")
    return {
        "id": run.id,
        "case_id": run.case_id,
        "merchant_id": run.merchant_id,
        "request_text": run.request_text,
        "plan": run.plan,
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "error": run.error,
    }


@router.get("/runs/{run_id}/trace")
async def get_trace(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    run = await db.get(AgentRun, run_id)
    if run is None:
        raise TaxLensError("ERR-RUN-001", 404, "Agent run không tồn tại")

    calls_result = await db.execute(
        select(ToolCall)
        .where(ToolCall.agent_run_id == run_id)
        .order_by(ToolCall.called_at.asc())
    )
    calls = calls_result.scalars().all()
    return {
        "run_id": run.id,
        "status": run.status,
        "plan": run.plan,
        "tool_calls": [
            {
                "agent_name": c.agent_name,
                "tool_name": c.tool_name,
                "input_hash": c.input_hash,
                "output_hash": c.output_hash,
                "confidence": float(c.confidence) if c.confidence else None,
                "rule_version": c.rule_version,
                "called_at": c.called_at.isoformat() if c.called_at else None,
                "duration_ms": c.duration_ms,
            }
            for c in calls
        ],
    }
