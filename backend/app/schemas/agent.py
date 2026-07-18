"""Pydantic models for agent inputs, outputs, and shared case state."""

from datetime import datetime
from decimal import Decimal
from typing import Any
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


AgentName = Literal["planner", "reconciliation", "tax_compliance", "merchant_ops"]
SpecialistAgentName = Literal["reconciliation", "tax_compliance", "merchant_ops"]
AgentRunStatusValue = Literal[
    "PENDING",
    "PLANNING",
    "EXECUTING",
    "WAITING_FOR_HUMAN",
    "COMPLETED",
    "FAILED",
]
CaseStatusValue = Literal["OPEN", "WAITING_FOR_CONFIRMATION", "RESOLVED", "CLOSED"]


class AgentSchema(BaseModel):
    """Base schema config for agent contracts."""

    model_config = ConfigDict(extra="forbid")


class AgentRunRequest(AgentSchema):
    """Input payload for a new agent run."""

    merchant_id: str
    period: str
    request_text: str
    case_id: str | None = None


class AgentRunResponse(AgentSchema):
    """Generic response envelope for agent execution."""

    status: AgentRunStatusValue
    output: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class PlannerPlanStep(AgentSchema):
    """Single step in the planner output."""

    step: int
    action: str
    agent: SpecialistAgentName


class PlannerPlan(AgentSchema):
    """Planner output schema."""

    plan: list[PlannerPlanStep] = Field(default_factory=list)


class SharedCaseState(AgentSchema):
    """Inter-agent shared contract derived from the architecture doc."""

    case_id: str
    merchant_id: str
    period: str
    transactions: list[dict[str, Any]] = Field(default_factory=list)
    sales: list[dict[str, Any]] = Field(default_factory=list)
    matches: list[dict[str, Any]] = Field(default_factory=list)
    exceptions: list[dict[str, Any]] = Field(default_factory=list)
    tax_rule_version: str
    human_approvals: list[dict[str, Any]] = Field(default_factory=list)
    case_status: str


class AgentTraceEvent(AgentSchema):
    """Trace event emitted by LangGraph nodes."""

    agent: AgentName | Literal["workflow"]
    status: str
    message: str
    timestamp: datetime | None = None
    tool_name: str | None = None
    confidence: Decimal | None = None
    duration_ms: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ToolCallRequest(AgentSchema):
    """Common audit envelope for a typed tool call."""

    agent_name: AgentName
    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class ToolCallResult(AgentSchema):
    """Common result envelope for a typed tool call."""

    tool_name: str
    output: dict[str, Any] | list[dict[str, Any]] | str | None = None
    confidence: Decimal | None = None
    rule_version: str | None = None
    error: str | None = None


class MatchCandidate(AgentSchema):
    """Candidate match returned by matching tools."""

    sale_id: str
    transaction_id: str | None = None
    score: Decimal
    confidence: Decimal
    reasoning: list[str] = Field(default_factory=list)


class ReconciliationExceptionDraft(AgentSchema):
    """Draft payload for a reconciliation exception."""

    case_id: str
    merchant_id: str
    period: str
    exception_type: str
    reason: str
    ai_suggestion: dict[str, Any] = Field(default_factory=dict)


class ReconciliationSummary(AgentSchema):
    """Reconciliation agent output schema."""

    merchant_id: str
    matched: int = 0
    unmatched: int = 0
    duplicate_candidates: int = 0
    missing_invoice_cases: int = 0
    exceptions: list[dict[str, Any]] = Field(default_factory=list)


class TaxChecklistItem(AgentSchema):
    """Single item in the tax readiness checklist.

    "pass" is a Python keyword so we use serialization_alias.
    Serialize with model.model_dump(by_alias=True) for JSON output.
    """

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str = Field(serialization_alias="item")
    value: Any = None
    threshold: Any = None
    passed: bool = Field(serialization_alias="pass")
    details: str | None = None


class TaxReadinessReport(AgentSchema):
    """Tax and compliance agent output schema."""

    rule_version: str
    checklist: list[TaxChecklistItem | dict[str, Any]] = Field(default_factory=list)
    ready: bool = False
    report: dict[str, Any] = Field(default_factory=dict)


class MerchantMessageDraft(AgentSchema):
    """Merchant-facing message draft."""

    case_id: str
    merchant_id: str
    period: str
    message: str
    requires_rm_review: bool = True


class MerchantOpsSummary(AgentSchema):
    """Merchant operations agent output schema."""

    cases_created: int = 0
    messages_drafted: int = 0
    exports_created: int = 0
    case_ids: list[str] = Field(default_factory=list)


class AgentWorkflowResult(AgentSchema):
    """Structured output for the full LangGraph agent workflow."""

    status: AgentRunStatusValue
    plan: PlannerPlan | None = None
    shared_state: SharedCaseState | None = None
    trace: list[AgentTraceEvent] = Field(default_factory=list)
    outputs: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)


__all__ = [
    "AgentName",
    "AgentRunRequest",
    "AgentRunResponse",
    "AgentRunStatusValue",
    "AgentSchema",
    "AgentTraceEvent",
    "AgentWorkflowResult",
    "CaseStatusValue",
    "MatchCandidate",
    "MerchantMessageDraft",
    "MerchantOpsSummary",
    "PlannerPlanStep",
    "PlannerPlan",
    "ReconciliationExceptionDraft",
    "ReconciliationSummary",
    "SharedCaseState",
    "SpecialistAgentName",
    "TaxChecklistItem",
    "TaxReadinessReport",
    "ToolCallRequest",
    "ToolCallResult",
]
