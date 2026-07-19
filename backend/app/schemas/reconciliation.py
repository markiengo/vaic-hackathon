from pydantic import BaseModel


class ExceptionResolveRequest(BaseModel):
    decision: str  # "approved" | "rejected"
    sale_id: str | None = None
    classification: str | None = None
    note: str | None = None


class ExceptionResolveResponse(BaseModel):
    exception_id: int
    status: str
    decision: str
    classification: str | None
    resolved_by: str | None
    resolved_at: str | None


class ReconcileRequest(BaseModel):
    period: str  # "YYYY-MM"
    request_text: str | None = None


class ReconcileResponse(BaseModel):
    run_id: str
    status: str
    plan: dict | None = None  # TODO [P2]: populated by LangGraph planner when agent runs


class CaseCreateRequest(BaseModel):
    merchant_id: str
    period: str


class CaseResponse(BaseModel):
    id: str
    merchant_id: str
    period: str
    status: str
    priority: str | None
    created: bool
    exception_count: int


class SupportRequest(BaseModel):
    merchant_id: str
    period: str
    topic: str  # e.g. "missing_invoice", "unmatched_transaction", "cash_discrepancy", "other"
    description: str
    priority: str = "MEDIUM"  # LOW | MEDIUM | HIGH


class SupportResponse(BaseModel):
    case_id: str
    status: str
    topic: str
    created: bool
