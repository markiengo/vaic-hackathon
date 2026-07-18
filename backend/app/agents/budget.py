"""Agent run budget guards for Sprint 2 orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class BudgetExceeded(RuntimeError):
    """Raised when an agent run exceeds configured safety limits."""


class ConcurrencyLimitExceeded(RuntimeError):
    """Raised when too many agent runs are active."""


def estimate_tokens(text: str) -> int:
    """Cheap deterministic token estimate; sufficient for budget guardrails."""

    return max(1, (len(text) + 3) // 4) if text else 0


@dataclass
class AgentRunBudget:
    max_llm_calls: int = 50
    max_input_tokens: int = 10_000
    max_output_tokens: int = 2_000
    llm_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0

    @classmethod
    def from_state(cls, state: dict[str, Any] | None) -> "AgentRunBudget":
        state = state or {}
        return cls(
            max_llm_calls=int(state.get("max_llm_calls", 50)),
            max_input_tokens=int(state.get("max_input_tokens", 10_000)),
            max_output_tokens=int(state.get("max_output_tokens", 2_000)),
            llm_calls=int(state.get("llm_calls", 0)),
            input_tokens=int(state.get("input_tokens", 0)),
            output_tokens=int(state.get("output_tokens", 0)),
        )

    def record_llm_call(self, *, input_text: str, output_text: str = "") -> None:
        self.llm_calls += 1
        self.input_tokens += estimate_tokens(input_text)
        self.output_tokens += estimate_tokens(output_text)
        self._validate()

    def record_output(self, output_text: str) -> None:
        self.output_tokens += estimate_tokens(output_text)
        self._validate()

    def _validate(self) -> None:
        if self.llm_calls > self.max_llm_calls:
            raise BudgetExceeded(f"LLM call budget exceeded: {self.llm_calls}/{self.max_llm_calls}")
        if self.input_tokens > self.max_input_tokens:
            raise BudgetExceeded(f"Input token budget exceeded: {self.input_tokens}/{self.max_input_tokens}")
        if self.output_tokens > self.max_output_tokens:
            raise BudgetExceeded(f"Output token budget exceeded: {self.output_tokens}/{self.max_output_tokens}")

    def model_dump(self) -> dict[str, int]:
        return {
            "max_llm_calls": self.max_llm_calls,
            "max_input_tokens": self.max_input_tokens,
            "max_output_tokens": self.max_output_tokens,
            "llm_calls": self.llm_calls,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
        }


class InMemoryConcurrencyLimiter:
    """Mockable limiter; P4 can replace this with Redis-backed accounting."""

    def __init__(self, max_concurrent_runs: int = 5) -> None:
        self.max_concurrent_runs = max_concurrent_runs
        self.active_runs = 0

    def acquire(self) -> None:
        if self.active_runs >= self.max_concurrent_runs:
            raise ConcurrencyLimitExceeded(
                f"Concurrent run limit exceeded: {self.active_runs}/{self.max_concurrent_runs}"
            )
        self.active_runs += 1

    def release(self) -> None:
        self.active_runs = max(0, self.active_runs - 1)


__all__ = [
    "AgentRunBudget",
    "BudgetExceeded",
    "ConcurrencyLimitExceeded",
    "InMemoryConcurrencyLimiter",
    "estimate_tokens",
]
