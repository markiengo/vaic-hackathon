"""Background task: run LangGraph agent workflow, persist results, push WS events."""
from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime, timezone

from app.core.database import AsyncSessionLocal
from app.core.ws_manager import ws_manager
from app.models.agent import AgentRun, AuditEvent, ToolCall


async def run_agent_workflow(
    run_id: str,
    case_id: str,
    merchant_id: str,
    period: str,
    request_text: str,
) -> None:
    """Execute LangGraph agent workflow in a thread executor and persist all results.

    Threading rationale (D.P0-1): agent_workflow.invoke() is synchronous. Calling it
    directly from an async function raises RuntimeError in executor.py._run_awaitable()
    because a running event loop is detected. run_in_executor() runs invoke() in a
    thread pool where no event loop exists, so tools can safely use asyncio.run().

    WS streaming rationale (D.P0-3): astream() is async and would run in the active
    event loop, causing the same RuntimeError as direct invoke(). workflow.stream()
    (sync generator) cannot push to async WS from a thread. Therefore all trace events
    are pushed in batch after invoke() completes — a technical constraint, not a
    simplicity choice. Post-demo improvement: thread + thread-safe queue bridge.
    """
    async with AsyncSessionLocal() as db:
        run = await db.get(AgentRun, run_id)
        if run is None:
            return

        try:
            # ----------------------------------------------------------------
            # PLANNING
            # ----------------------------------------------------------------
            run.status = "PLANNING"
            run.started_at = datetime.now(timezone.utc)  # explicit belt-and-suspenders
            await db.commit()
            await ws_manager.push_to_run(run_id, {"event": "status", "status": "PLANNING"})

            # ----------------------------------------------------------------
            # EXECUTING — run invoke() in thread (no running loop in thread)
            # asyncio.get_running_loop() used instead of deprecated get_event_loop()
            # ----------------------------------------------------------------
            run.status = "EXECUTING"
            await db.commit()
            await ws_manager.push_to_run(run_id, {"event": "status", "status": "EXECUTING"})

            from app.agents.graph import build_agent_workflow

            state: dict = {
                "agent_run_id": run_id,
                "case_id": case_id,
                "merchant_id": merchant_id,
                "period": period,
                "request_text": request_text,
                # Init accumulation keys so specialist nodes start from clean state
                "trace": [],
                "exceptions": [],
                "completed_agents": [],
            }
            agent_workflow = build_agent_workflow()

            loop = asyncio.get_running_loop()
            output: dict = await loop.run_in_executor(None, agent_workflow.invoke, state)

            # ----------------------------------------------------------------
            # Persist plan
            # ----------------------------------------------------------------
            run.plan = output.get("plan")

            # ----------------------------------------------------------------
            # Persist ToolCall + AuditEvent rows
            #
            # specialists.py returns tool results in three fields:
            #   output["reconciliation_tool_calls"]   — list[ToolExecution.as_output()]
            #   output["tax_compliance_tool_calls"]   — list[ToolExecution.as_output()]
            #   output["merchant_ops_tool_calls"]     — list[ToolExecution.as_output()]
            #
            # Each dict (from as_output() in executor.py:72-79) has exactly:
            #   {"tool_name", "status", "output", "error", "duration_ms"}
            # NOTE: ToolExecution has NO confidence field; as_output() does not include
            # confidence. confidence=None is intentional — not a gap to fill later.
            # Confidence, if needed, would require changes to ToolExecution and as_output().
            #
            # output["trace"] — list[ToolExecution.as_trace_event()] — has exactly:
            #   {"agent", "status", "message", "tool_name", "duration_ms"}
            # Used to resolve agent_name per tool_name.
            # ----------------------------------------------------------------
            trace_events: list[dict] = output.get("trace", [])

            # Map tool_name → agent_name from trace (last-write-wins if duplicate)
            agent_by_tool: dict[str, str] = {
                ev["tool_name"]: ev["agent"]
                for ev in trace_events
                if "tool_name" in ev and "agent" in ev
            }

            all_tool_calls: list[dict] = []
            for field in (
                "reconciliation_tool_calls",
                "tax_compliance_tool_calls",
                "merchant_ops_tool_calls",
            ):
                all_tool_calls.extend(output.get(field) or [])

            for tc in all_tool_calls:
                tool_name: str = tc.get("tool_name", "unknown")
                output_data = tc.get("output")
                error_data = tc.get("error")
                duration_ms: int = tc.get("duration_ms", 0)
                agent_name: str = agent_by_tool.get(tool_name, "unknown")

                input_hash = hashlib.sha256(
                    json.dumps({"tool": tool_name}, sort_keys=True).encode()
                ).hexdigest()[:16]
                output_payload = output_data if output_data is not None else error_data
                output_hash = hashlib.sha256(
                    json.dumps(output_payload, default=str, sort_keys=True).encode()
                ).hexdigest()[:16]

                # ToolCall — field names verified against models/agent.py
                tool_call_row = ToolCall(
                    agent_run_id=run_id,
                    agent_name=agent_name,    # String(50), NOT NULL
                    tool_name=tool_name,       # String(100), NOT NULL
                    input_hash=input_hash,     # String(64), nullable
                    output_hash=output_hash,   # String(64), nullable
                    confidence=None,           # Numeric(5,2), nullable — no confidence in as_output()
                    rule_version=None,         # String(20), nullable — not emitted at this layer
                    duration_ms=duration_ms,   # Integer, nullable
                    # called_at: server_default=func.now() — DB sets automatically
                )
                db.add(tool_call_row)

                # AuditEvent — field names verified against models/agent.py
                # NOT NULL fields: actor_type, actor_id, action
                audit_event = AuditEvent(
                    actor_type="agent",        # String(20), NOT NULL
                    actor_id=agent_name,       # String(50), NOT NULL
                    agent_name=agent_name,     # String(50), nullable
                    action="tool_call",        # String(100), NOT NULL
                    tool_name=tool_name,       # String(100), nullable
                    input_hash=input_hash,     # String(64), nullable
                    output_hash=output_hash,   # String(64), nullable
                    confidence=None,           # Numeric(5,2), nullable
                    rule_version=None,         # String(20), nullable
                    approval_status=None,      # String(20), nullable
                    merchant_id=merchant_id,   # FK String(20), nullable
                    # timestamp: server_default=func.now() — DB sets automatically
                )
                db.add(audit_event)

            # ----------------------------------------------------------------
            # COMPLETED — single commit: plan + all ToolCall + AuditEvent rows
            # ----------------------------------------------------------------
            run.status = "COMPLETED"
            run.completed_at = datetime.now(timezone.utc)
            await db.commit()

            # ----------------------------------------------------------------
            # Push batch WS events after invoke() completes (D.P0-3)
            # ----------------------------------------------------------------
            for ev in trace_events:
                await ws_manager.push_to_run(run_id, {"event": "tool_trace", **ev})
            await ws_manager.push_to_run(
                run_id,
                {"event": "status", "status": "COMPLETED", "plan": run.plan},
            )

        except Exception as exc:
            # Use a fresh session — original db may be in a bad state after exception
            async with AsyncSessionLocal() as err_db:
                err_run = await err_db.get(AgentRun, run_id)
                if err_run:
                    err_run.status = "FAILED"
                    err_run.error = str(exc)[:500]
                    err_run.completed_at = datetime.now(timezone.utc)
                    await err_db.commit()
            await ws_manager.push_to_run(
                run_id,
                {"event": "status", "status": "FAILED", "error": str(exc)[:200]},
            )
