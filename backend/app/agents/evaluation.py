"""Sprint 4 quality gates for P2 agent outputs."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable

from pydantic import ValidationError

from app.agents.executor import TOOL_ALLOWLIST
from app.schemas.agent import MerchantOpsSummary, PlannerPlan, ReconciliationSummary, TaxReadinessReport


VIETNAMESE_MESSAGE_MARKERS: frozenset[str] = frozenset(
    {
        "kính gửi",
        "vui lòng",
        "xác nhận",
        "cung cấp",
        "hóa đơn",
        "giao dịch",
        "đối soát",
        "cảm ơn",
        "liên hệ",
    }
)
ACTION_MARKERS: frozenset[str] = frozenset({"vui lòng", "xác nhận", "cung cấp", "phản hồi", "liên hệ"})


@dataclass(frozen=True)
class ValidationResult:
    passed: bool
    errors: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class MessageQualityResult:
    passed: bool
    score: float
    reasons: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ConfidenceCalibrationResult:
    passed: bool
    agreement_rate: float
    overconfident_errors: int
    underconfident_correct: int
    total: int


def validate_structured_agent_outputs(workflow_output: dict[str, Any]) -> ValidationResult:
    """Validate the Sprint 4 structured JSON criterion against Pydantic schemas."""

    errors: list[str] = []
    validators: tuple[tuple[str, Any, Any], ...] = (
        ("plan", PlannerPlan, {"plan": workflow_output.get("plan", [])}),
        ("reconciliation_output", ReconciliationSummary, workflow_output.get("reconciliation_output")),
        ("tax_compliance_output", TaxReadinessReport, workflow_output.get("tax_compliance_output")),
        ("merchant_ops_output", MerchantOpsSummary, workflow_output.get("merchant_ops_output")),
    )
    for name, schema, payload in validators:
        try:
            schema.model_validate(payload)
        except ValidationError as exc:
            errors.append(f"{name}: {exc.errors()}")
    return ValidationResult(passed=not errors, errors=errors)


def evaluate_message_quality(message: str) -> MessageQualityResult:
    """Check whether a merchant-facing draft is natural enough for RM review."""

    normalized = " ".join(message.casefold().split())
    reasons: list[str] = []
    score = 0.0
    if len(normalized) >= 80:
        score += 0.2
    else:
        reasons.append("message_too_short")
    if any(marker in normalized for marker in VIETNAMESE_MESSAGE_MARKERS):
        score += 0.25
    else:
        reasons.append("missing_vietnamese_business_language")
    if any(marker in normalized for marker in ACTION_MARKERS):
        score += 0.25
    else:
        reasons.append("missing_clear_action")
    if "m001" in normalized or "salon" in normalized or "merchant" in normalized:
        score += 0.15
    else:
        reasons.append("missing_merchant_context")
    if "2026-07" in normalized or "tháng 7" in normalized:
        score += 0.15
    else:
        reasons.append("missing_period_context")
    return MessageQualityResult(passed=score >= 0.8, score=round(score, 2), reasons=reasons)


def message_acceptance_rate(messages: list[str]) -> float:
    if not messages:
        return 0.0
    accepted = sum(1 for message in messages if evaluate_message_quality(message).passed)
    return accepted / len(messages)


def evaluate_confidence_calibration(suggestions: list[dict[str, Any]]) -> ConfidenceCalibrationResult:
    """Detect systematic over/under confidence against expected decisions."""

    if not suggestions:
        return ConfidenceCalibrationResult(True, 1.0, 0, 0, 0)

    agreements = 0
    overconfident_errors = 0
    underconfident_correct = 0
    for suggestion in suggestions:
        predicted = suggestion.get("suggested_type") or suggestion.get("prediction")
        expected = suggestion.get("expected_type") or suggestion.get("human_decision")
        confidence = float(suggestion.get("confidence", 0))
        is_correct = predicted == expected
        agreements += int(is_correct)
        if not is_correct and confidence >= 0.95:
            overconfident_errors += 1
        if is_correct and confidence < 0.75:
            underconfident_correct += 1

    total = len(suggestions)
    agreement_rate = agreements / total
    passed = agreement_rate >= 0.8 and overconfident_errors == 0 and underconfident_correct / total <= 0.2
    return ConfidenceCalibrationResult(
        passed=passed,
        agreement_rate=round(agreement_rate, 4),
        overconfident_errors=overconfident_errors,
        underconfident_correct=underconfident_correct,
        total=total,
    )


def hallucination_rate(tool_calls: list[dict[str, Any]]) -> float:
    if not tool_calls:
        return 0.0
    invalid = 0
    for call in tool_calls:
        agent_name = call.get("agent") or call.get("agent_name")
        tool_name = call.get("tool_name") or call.get("tool")
        allowed_tools = TOOL_ALLOWLIST.get(agent_name, frozenset())
        invalid += int(tool_name not in allowed_tools)
    return invalid / len(tool_calls)


def latency_within_limit(elapsed_seconds: float, limit_seconds: float = 30.0) -> bool:
    return elapsed_seconds < limit_seconds


def measure_latency_seconds(callable_: Callable[[], Any]) -> tuple[Any, float]:
    started = time.perf_counter()
    result = callable_()
    return result, time.perf_counter() - started


__all__ = [
    "ConfidenceCalibrationResult",
    "MessageQualityResult",
    "ValidationResult",
    "evaluate_confidence_calibration",
    "evaluate_message_quality",
    "hallucination_rate",
    "latency_within_limit",
    "measure_latency_seconds",
    "message_acceptance_rate",
    "validate_structured_agent_outputs",
]
