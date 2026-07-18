"""P2-owned agent run orchestration entrypoint.

P4 can call this from an API router later. It deliberately avoids importing
database/session code so it can be unit-tested with mocks in P2 scope.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.agents.audit import AgentRunRecorder, InMemoryAgentRunRecorder
from app.agents.budget import AgentRunBudget, BudgetExceeded, ConcurrencyLimitExceeded, InMemoryConcurrencyLimiter
from app.agents.graph import agent_workflow
from app.agents.state import AgentRunStatus
from app.schemas.agent import AgentRunRequest, AgentRunResponse


@dataclass
class AgentRunner:
    workflow: Any = agent_workflow
    recorder: AgentRunRecorder = field(default_factory=InMemoryAgentRunRecorder)
    concurrency_limiter: InMemoryConcurrencyLimiter = field(default_factory=InMemoryConcurrencyLimiter)
    default_budget: AgentRunBudget = field(default_factory=AgentRunBudget)

    def run(self, request: AgentRunRequest | dict[str, Any], *, initial_state: dict[str, Any] | None = None) -> AgentRunResponse:
        payload = AgentRunRequest.model_validate(request)
        run_id = self.recorder.start_run(
            merchant_id=payload.merchant_id,
            period=payload.period,
            request_text=payload.request_text,
            case_id=payload.case_id,
        )

        try:
            self.concurrency_limiter.acquire()
            self.recorder.transition(run_id, AgentRunStatus.PLANNING)
            state = {
                "agent_run_id": run_id,
                "case_id": payload.case_id,
                "merchant_id": payload.merchant_id,
                "period": payload.period,
                "request_text": payload.request_text,
                "run_status": AgentRunStatus.PLANNING.value,
                "budget": self.default_budget.model_dump(),
                **(initial_state or {}),
            }
            self.recorder.transition(run_id, AgentRunStatus.EXECUTING)
            output = self.workflow.invoke(state)
            status = AgentRunStatus(output.get("run_status", AgentRunStatus.COMPLETED.value))
            terminal_status = AgentRunStatus.COMPLETED if status == AgentRunStatus.COMPLETED else AgentRunStatus.FAILED
            self.recorder.transition(run_id, terminal_status, plan=output.get("plan"), errors=output.get("errors", []))
            return AgentRunResponse(
                status=terminal_status.value,
                output={
                    "agent_run_id": run_id,
                    "plan": output.get("plan"),
                    "reconciliation": output.get("reconciliation_output"),
                    "tax_compliance": output.get("tax_compliance_output"),
                    "merchant_ops": output.get("merchant_ops_output"),
                    "trace": output.get("trace", []),
                    "tool_calls": {
                        "reconciliation": output.get("reconciliation_tool_calls", []),
                        "tax_compliance": output.get("tax_compliance_tool_calls", []),
                        "merchant_ops": output.get("merchant_ops_tool_calls", []),
                    },
                    "errors": output.get("errors", []),
                },
            )
        except (BudgetExceeded, ConcurrencyLimitExceeded, Exception) as exc:
            self.recorder.transition(run_id, AgentRunStatus.FAILED, error=str(exc))
            return AgentRunResponse(status=AgentRunStatus.FAILED.value, output={"agent_run_id": run_id}, error=str(exc))
        finally:
            self.concurrency_limiter.release()


default_agent_runner = AgentRunner()


__all__ = [
    "AgentRunner",
    "default_agent_runner",
]
