"""Agent state machine definitions."""

from enum import Enum


class AgentRunStatus(str, Enum):
    """Shared lifecycle for agent runs."""

    PENDING = "PENDING"
    PLANNING = "PLANNING"
    EXECUTING = "EXECUTING"
    WAITING_FOR_HUMAN = "WAITING_FOR_HUMAN"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


TERMINAL_AGENT_RUN_STATUSES: frozenset[AgentRunStatus] = frozenset(
    {AgentRunStatus.COMPLETED, AgentRunStatus.FAILED}
)

ALLOWED_AGENT_RUN_TRANSITIONS: dict[AgentRunStatus, frozenset[AgentRunStatus]] = {
    AgentRunStatus.PENDING: frozenset({AgentRunStatus.PLANNING, AgentRunStatus.FAILED}),
    AgentRunStatus.PLANNING: frozenset({AgentRunStatus.EXECUTING, AgentRunStatus.FAILED}),
    AgentRunStatus.EXECUTING: frozenset(
        {
            AgentRunStatus.WAITING_FOR_HUMAN,
            AgentRunStatus.COMPLETED,
            AgentRunStatus.FAILED,
        }
    ),
    AgentRunStatus.WAITING_FOR_HUMAN: frozenset(
        {AgentRunStatus.EXECUTING, AgentRunStatus.COMPLETED, AgentRunStatus.FAILED}
    ),
    AgentRunStatus.COMPLETED: frozenset(),
    AgentRunStatus.FAILED: frozenset(),
}


def can_transition_agent_run(from_status: AgentRunStatus, to_status: AgentRunStatus) -> bool:
    """Return whether an agent run status transition is allowed."""

    return to_status in ALLOWED_AGENT_RUN_TRANSITIONS[from_status]


def assert_valid_agent_run_transition(
    from_status: AgentRunStatus,
    to_status: AgentRunStatus,
) -> None:
    """Raise ValueError when an agent run transition is not allowed."""

    if not can_transition_agent_run(from_status, to_status):
        raise ValueError(f"Invalid agent run transition: {from_status.value} -> {to_status.value}")


__all__ = [
    "AgentRunStatus",
    "ALLOWED_AGENT_RUN_TRANSITIONS",
    "TERMINAL_AGENT_RUN_STATUSES",
    "assert_valid_agent_run_transition",
    "can_transition_agent_run",
]
