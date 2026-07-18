"""Agent run transition recorder contracts.

This module intentionally has no database dependency. P4 can provide a
SQLAlchemy-backed recorder later while P2 tests use the in-memory recorder.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol
from uuid import uuid4

from app.agents.state import AgentRunStatus


@dataclass(frozen=True)
class AgentRunTransition:
    run_id: str
    status: AgentRunStatus
    timestamp: datetime
    metadata: dict[str, Any] = field(default_factory=dict)


class AgentRunRecorder(Protocol):
    def start_run(self, *, merchant_id: str, period: str, request_text: str, case_id: str | None) -> str:
        ...

    def transition(self, run_id: str, status: AgentRunStatus, **metadata: Any) -> None:
        ...


class InMemoryAgentRunRecorder:
    """Simple recorder for tests and local runner usage without DB access."""

    def __init__(self) -> None:
        self.transitions: dict[str, list[AgentRunTransition]] = {}
        self.runs: dict[str, dict[str, Any]] = {}

    def start_run(self, *, merchant_id: str, period: str, request_text: str, case_id: str | None) -> str:
        run_id = f"AR-{uuid4().hex[:12].upper()}"
        self.runs[run_id] = {
            "id": run_id,
            "merchant_id": merchant_id,
            "period": period,
            "request_text": request_text,
            "case_id": case_id,
            "status": AgentRunStatus.PENDING.value,
            "started_at": datetime.now(timezone.utc),
            "completed_at": None,
            "error": None,
        }
        self.transition(run_id, AgentRunStatus.PENDING)
        return run_id

    def transition(self, run_id: str, status: AgentRunStatus, **metadata: Any) -> None:
        timestamp = datetime.now(timezone.utc)
        self.transitions.setdefault(run_id, []).append(
            AgentRunTransition(run_id=run_id, status=status, timestamp=timestamp, metadata=metadata)
        )
        if run_id in self.runs:
            self.runs[run_id]["status"] = status.value
            if status in {AgentRunStatus.COMPLETED, AgentRunStatus.FAILED}:
                self.runs[run_id]["completed_at"] = timestamp
            if status == AgentRunStatus.FAILED:
                self.runs[run_id]["error"] = str(metadata.get("error", ""))


__all__ = [
    "AgentRunRecorder",
    "AgentRunTransition",
    "InMemoryAgentRunRecorder",
]
