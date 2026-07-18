from pydantic import BaseModel


class ConfirmTokenResponse(BaseModel):
    exception_id: int
    status: str
    amount: str | None
    sender_name: str | None
    date: str | None
    raw_note: str | None
    ai_suggestion: str | None
    confidence: float | None
    ai_reasoning: str | None
    expires_at: str
    options: list[str]


class ConfirmSubmitRequest(BaseModel):
    classification: str  # "revenue" | "internal_transfer" | "loan" | "other"


class ConfirmSubmitResponse(BaseModel):
    status: str  # "CONFIRMED" | "ALREADY_CONFIRMED"
    exception_id: int
    classification: str
