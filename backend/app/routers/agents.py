import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.core.security import TaxLensError, get_current_user
from app.core.ws_manager import ws_manager
from app.models.agent import AgentRun, ToolCall
from app.schemas.agent import AgentRunRequest
from app.agents.runner import AgentRunner

router = APIRouter(prefix="/agents", tags=["agents"])
logger = logging.getLogger(__name__)


class AgentRunStartRequest(BaseModel):
    """P3's api.ts shape: {merchant_id, period, request}.
    'request' maps to request_text on AgentRun."""
    merchant_id: str
    period: str
    request: str
    case_id: str | None = None


async def _dispatch_agent_run(run_id: str, merchant_id: str, period: str, request_text: str, case_id: str | None) -> None:
    """Background task: run the real LangGraph agent workflow and persist results."""
    try:
        await ws_manager.push_to_run(run_id, {
            "type": "agent_status",
            "run_id": run_id,
            "status": "EXECUTING",
        })

        runner = AgentRunner()
        response = runner.run(
            AgentRunRequest(
                merchant_id=merchant_id,
                period=period,
                request_text=request_text,
                case_id=case_id,
            )
        )

        async with AsyncSessionLocal() as session:
            run = await session.get(AgentRun, run_id)
            if run is not None:
                run.status = response.status
                run.plan = response.output.get("plan")
                run.completed_at = datetime.now(timezone.utc)
                if response.error:
                    run.error = response.error
                await session.commit()

                # Persist tool calls
                tool_calls = response.output.get("tool_calls", {})
                for agent_name, calls in tool_calls.items():
                    if not isinstance(calls, list):
                        continue
                    for tc in calls:
                        if not isinstance(tc, dict):
                            continue
                        session.add(ToolCall(
                            agent_run_id=run_id,
                            agent_name=agent_name,
                            tool_name=tc.get("tool_name", ""),
                            input_hash=tc.get("input_hash"),
                            output_hash=tc.get("output_hash"),
                            confidence=tc.get("confidence"),
                            rule_version=tc.get("rule_version"),
                            duration_ms=tc.get("duration_ms"),
                        ))
                await session.commit()

        # Broadcast trace events via WebSocket
        trace = response.output.get("trace", [])
        for event in trace:
            await ws_manager.push_to_run(run_id, {
                "type": "agent_trace",
                "run_id": run_id,
                "event": event,
            })

        await ws_manager.push_to_run(run_id, {
            "type": "agent_status",
            "run_id": run_id,
            "status": response.status,
        })
    except Exception as exc:
        logger.exception("Agent run %s failed", run_id)
        async with AsyncSessionLocal() as session:
            run = await session.get(AgentRun, run_id)
            if run is not None:
                run.status = "FAILED"
                run.error = str(exc)
                run.completed_at = datetime.now(timezone.utc)
                await session.commit()
        await ws_manager.push_to_run(run_id, {
            "type": "agent_status",
            "run_id": run_id,
            "status": "FAILED",
            "error": str(exc),
        })


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

    background_tasks.add_task(_dispatch_agent_run, run_id, body.merchant_id, body.period, body.request, body.case_id)

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
