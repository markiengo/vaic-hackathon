"""Tool execution boundary for agent nodes."""

from __future__ import annotations

import asyncio
import importlib
import inspect
import time
from dataclasses import dataclass
from typing import Any, Literal

AgentName = Literal["planner", "reconciliation", "tax_compliance", "merchant_ops"]
ToolStatus = Literal["completed", "pending_implementation", "rejected", "failed", "skipped"]

TOOL_ALLOWLIST: dict[AgentName, frozenset[str]] = {
    "planner": frozenset(),
    "reconciliation": frozenset(
        {
            "get_bank_transactions",
            "get_sales_orders",
            "get_cash_sessions",
            "get_invoices",
            "find_payment_reference",
            "score_match_candidates",
            "create_reconciliation_exception",
        }
    ),
    "tax_compliance": frozenset(
        {
            "retrieve_tax_rules",
            "validate_rule_version",
            "classify_revenue_category",
            "check_required_fields",
            "generate_tax_readiness_report",
            "create_draft_export",
        }
    ),
    "merchant_ops": frozenset(
        {
            "create_case",
            "assign_task_to_rm",
            "draft_merchant_message",
            "send_confirmation_request",
            "update_case_status",
            "export_to_accounting_system",
        }
    ),
}


@dataclass(frozen=True)
class ToolExecution:
    """Structured result from one agent tool call attempt."""

    agent_name: AgentName
    tool_name: str
    arguments: dict[str, Any]
    status: ToolStatus
    output: Any = None
    error: str | None = None
    duration_ms: int = 0

    def as_trace_event(self) -> dict[str, Any]:
        return {
            "agent": self.agent_name,
            "status": self.status,
            "message": self.error or f"Tool {self.tool_name} {self.status}.",
            "tool_name": self.tool_name,
            "duration_ms": self.duration_ms,
        }

    def as_output(self) -> dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "status": self.status,
            "output": self.output,
            "error": self.error,
            "duration_ms": self.duration_ms,
        }


def _serialize_output(output: Any) -> Any:
    if hasattr(output, "model_dump"):
        return output.model_dump()
    if isinstance(output, list):
        return [_serialize_output(item) for item in output]
    if isinstance(output, tuple):
        return [_serialize_output(item) for item in output]
    return output


async def _await_with_scope(value: Any, agent_name: AgentName, agent_run_id: str | None) -> Any:
    if agent_run_id is None:
        return await value

    from app.tools._tracing import agent_run_scope

    async with agent_run_scope(agent_run_id, agent_name):
        return await value


def _run_awaitable(value: Any, agent_name: AgentName, agent_run_id: str | None) -> Any:
    if not inspect.isawaitable(value):
        return value
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_await_with_scope(value, agent_name, agent_run_id))
    raise RuntimeError("Async tool returned awaitable; call it from an async agent executor.")


def _load_tools_module() -> Any:
    return importlib.import_module("app.tools")


def execute_tool(
    agent_name: AgentName,
    tool_name: str,
    arguments: dict[str, Any],
    *,
    agent_run_id: str | None = None,
) -> ToolExecution:
    """Execute a tool through the P2 allowlist and tracing boundary."""

    started = time.perf_counter()
    allowed_tools = TOOL_ALLOWLIST[agent_name]
    if tool_name not in allowed_tools:
        return ToolExecution(
            agent_name=agent_name,
            tool_name=tool_name,
            arguments=arguments,
            status="rejected",
            error=f"Tool '{tool_name}' is not allowed for agent '{agent_name}'.",
        )

    try:
        tools = _load_tools_module()
    except Exception as exc:
        return ToolExecution(
            agent_name=agent_name,
            tool_name=tool_name,
            arguments=arguments,
            status="failed",
            error=f"Tool registry unavailable: {exc}",
        )

    tool_fn = getattr(tools, tool_name, None)
    if tool_fn is None or not callable(tool_fn):
        return ToolExecution(
            agent_name=agent_name,
            tool_name=tool_name,
            arguments=arguments,
            status="rejected",
            error=f"Tool '{tool_name}' is not registered.",
        )

    try:
        output = _run_awaitable(tool_fn(**arguments), agent_name, agent_run_id)
        duration_ms = int((time.perf_counter() - started) * 1000)
        return ToolExecution(
            agent_name=agent_name,
            tool_name=tool_name,
            arguments=arguments,
            status="completed",
            output=_serialize_output(output),
            duration_ms=duration_ms,
        )
    except NotImplementedError as exc:
        duration_ms = int((time.perf_counter() - started) * 1000)
        return ToolExecution(
            agent_name=agent_name,
            tool_name=tool_name,
            arguments=arguments,
            status="pending_implementation",
            error=str(exc),
            duration_ms=duration_ms,
        )
    except Exception as exc:
        duration_ms = int((time.perf_counter() - started) * 1000)
        return ToolExecution(
            agent_name=agent_name,
            tool_name=tool_name,
            arguments=arguments,
            status="failed",
            error=str(exc),
            duration_ms=duration_ms,
        )


def skip_tool(agent_name: AgentName, tool_name: str, arguments: dict[str, Any], reason: str) -> ToolExecution:
    """Record an intentionally skipped tool step without executing side effects."""

    return ToolExecution(
        agent_name=agent_name,
        tool_name=tool_name,
        arguments=arguments,
        status="skipped",
        error=reason,
    )


__all__ = [
    "AgentName",
    "TOOL_ALLOWLIST",
    "ToolExecution",
    "ToolStatus",
    "execute_tool",
    "skip_tool",
]
