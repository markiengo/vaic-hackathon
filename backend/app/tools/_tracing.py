"""Tool-call traceability (DEC-001/DEC-004): every tool call writes to
``tool_calls`` and ``audit_events`` with hashed input/output.

Tool functions in ``app.tools`` are called by name via LLM function-calling
(typed Python functions, JSON-serializable arguments only — see
docs/05-domain/01-ai-advisor.md § Tool contracts), so their signatures
cannot carry a DB session or an ``agent_run_id``. Instead, the agent
execution layer (P2, when it wires the specialist LangGraph nodes to call
these tools for real) sets the current run/agent via ``agent_run_scope``
around a batch of tool calls; the ``@traced_tool`` decorator picks that
context up automatically. Outside of any run (e.g. a tool called directly
from a script, or before P2's wiring lands), calls still write an
``audit_events`` row with ``actor_type="system"`` — ``tool_calls`` rows are
skipped in that case since ``agent_run_id`` is a required FK.

Prompts and full LLM responses are never persisted here — only
SHA-256 hashes of the tool's input/output, per the AI-advisor spec's
privacy section.
"""

from __future__ import annotations

import hashlib
import inspect
import json
import time
from contextlib import asynccontextmanager
from contextvars import ContextVar
from decimal import Decimal
from functools import wraps
from typing import Any, Awaitable, Callable, TypeVar

from app.core.database import AsyncSessionLocal
from app.models.agent import AgentRun, AuditEvent, ToolCall

_current_agent_run_id: ContextVar[str | None] = ContextVar("current_agent_run_id", default=None)
_current_agent_name: ContextVar[str | None] = ContextVar("current_agent_name", default=None)

F = TypeVar("F", bound=Callable[..., Awaitable[Any]])


@asynccontextmanager
async def agent_run_scope(agent_run_id: str, agent_name: str):
    """Set the (agent_run_id, agent_name) that ``@traced_tool`` calls attach to.

    Usage (from the agent execution layer):
        async with agent_run_scope(run.id, "reconciliation"):
            result = await get_bank_transactions(merchant_id, period)
    """

    run_token = _current_agent_run_id.set(agent_run_id)
    name_token = _current_agent_name.set(agent_name)
    try:
        yield
    finally:
        _current_agent_run_id.reset(run_token)
        _current_agent_name.reset(name_token)


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    return str(value)


def _to_jsonable(value: Any) -> Any:
    """Normalize a tool's return value (dict/list/Pydantic model) for hashing."""

    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    return value


def _hash(value: Any) -> str:
    payload = json.dumps(_to_jsonable(value), sort_keys=True, default=_json_default, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _field(output: Any, name: str) -> Any:
    """Read a field from either a plain dict or a Pydantic model output."""

    if isinstance(output, dict):
        return output.get(name)
    return getattr(output, name, None)


def _extract_confidence(output: Any) -> Decimal | None:
    value = _field(output, "confidence")
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, ArithmeticError):
        return None


def _extract_rule_version(output: Any) -> str | None:
    value = _field(output, "rule_version")
    return str(value) if value is not None else None


def _extract_merchant_id(bound_args: dict[str, Any]) -> str | None:
    value = bound_args.get("merchant_id")
    return str(value) if value is not None else None


async def _persist_call(
    *,
    tool_name: str,
    bound_args: dict[str, Any],
    output: Any,
    duration_ms: int,
    error: str | None,
) -> None:
    agent_run_id = _current_agent_run_id.get()
    agent_name = _current_agent_name.get() or "system"
    input_hash = _hash(bound_args)
    output_hash = _hash(output if error is None else {"error": error})
    confidence = _extract_confidence(output) if error is None else None
    rule_version = _extract_rule_version(output) if error is None else None
    merchant_id = _extract_merchant_id(bound_args)

    async with AsyncSessionLocal() as db:
        if merchant_id is None and agent_run_id is not None:
            # Several tools (assign_task_to_rm, retrieve_tax_rules,
            # find_payment_reference, classify_revenue_category, ...) have no
            # merchant_id in their own arguments, which otherwise leaves this
            # audit_events row unscoped and invisible to a merchant-filtered
            # GET /audit/export — fall back to the run's own merchant_id.
            run = await db.get(AgentRun, agent_run_id)
            if run is not None:
                merchant_id = run.merchant_id

        if agent_run_id is not None:
            db.add(
                ToolCall(
                    agent_run_id=agent_run_id,
                    agent_name=agent_name,
                    tool_name=tool_name,
                    input_hash=input_hash,
                    output_hash=output_hash,
                    confidence=confidence,
                    rule_version=rule_version,
                    duration_ms=duration_ms,
                )
            )
        db.add(
            AuditEvent(
                actor_type="agent" if agent_run_id is not None else "system",
                actor_id=agent_name,
                agent_name=agent_name if agent_run_id is not None else None,
                action="tool_call" if error is None else "tool_call_error",
                tool_name=tool_name,
                input_hash=input_hash,
                output_hash=output_hash,
                rule_version=rule_version,
                confidence=confidence,
                merchant_id=merchant_id,
            )
        )
        await db.commit()


def traced_tool(func: F) -> F:
    """Decorator: log every call of an async tool function to tool_calls/audit_events."""

    signature = inspect.signature(func)

    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        bound = signature.bind(*args, **kwargs)
        bound.apply_defaults()
        bound_args = dict(bound.arguments)

        started = time.perf_counter()
        try:
            result = await func(*args, **kwargs)
        except Exception as exc:
            duration_ms = int((time.perf_counter() - started) * 1000)
            await _persist_call(
                tool_name=func.__name__,
                bound_args=bound_args,
                output=None,
                duration_ms=duration_ms,
                error=str(exc),
            )
            raise

        duration_ms = int((time.perf_counter() - started) * 1000)
        await _persist_call(
            tool_name=func.__name__,
            bound_args=bound_args,
            output=result,
            duration_ms=duration_ms,
            error=None,
        )
        return result

    return wrapper  # type: ignore[return-value]


__all__ = ["agent_run_scope", "traced_tool"]
