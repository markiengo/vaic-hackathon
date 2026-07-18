import time

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError
from app.models.reconciliation import ExceptionRecord
from app.models.transaction import BankTransaction
from app.schemas.confirm import ConfirmSubmitRequest, ConfirmSubmitResponse, ConfirmTokenResponse
from app.services.confirmation_tokens import (
    InvalidConfirmationToken,
    decode_confirmation_token,
)

router = APIRouter(prefix="/confirm", tags=["confirm"])

_VALID_CLASSIFICATIONS = {"revenue", "internal_transfer", "loan", "other"}


def _decode_or_raise(token: str):
    """Decode HMAC token; map errors to ERR-TOKEN-001/002."""
    try:
        return decode_confirmation_token(token)
    except InvalidConfirmationToken as exc:
        if "expired" in str(exc):
            raise TaxLensError("ERR-TOKEN-002", 410, "Token xác nhận đã hết hạn")
        raise TaxLensError("ERR-TOKEN-001", 404, "Token xác nhận không hợp lệ")


@router.get("/{token}", response_model=ConfirmTokenResponse)
async def get_confirmation(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> ConfirmTokenResponse:
    ct = _decode_or_raise(token)

    ex = await db.get(ExceptionRecord, ct.exception_id)
    if ex is None:
        raise TaxLensError("ERR-TOKEN-001", 404, "Exception không tồn tại")

    tx = None
    if ex.bank_transaction_id:
        tx = await db.get(BankTransaction, ex.bank_transaction_id)

    suggestion = ex.ai_suggestion or {}
    ai_suggestion_label = suggestion.get("classification") or suggestion.get("suggestion")
    confidence = suggestion.get("confidence")

    return ConfirmTokenResponse(
        exception_id=ex.id,
        status=ex.status,
        amount=str(tx.amount) if tx else suggestion.get("amount"),
        sender_name=tx.sender_name if tx else suggestion.get("sender_name"),
        date=tx.transaction_date.date().isoformat() if tx and tx.transaction_date else None,
        raw_note=tx.raw_note if tx else None,
        ai_suggestion=ai_suggestion_label,
        confidence=float(confidence) if confidence is not None else None,
        ai_reasoning=suggestion.get("reasoning"),
        expires_at=str(ct.expires_at),
        options=list(_VALID_CLASSIFICATIONS),
    )


@router.post("/{token}", response_model=ConfirmSubmitResponse)
async def submit_confirmation(
    token: str,
    body: ConfirmSubmitRequest,
    db: AsyncSession = Depends(get_db),
) -> ConfirmSubmitResponse:
    if body.classification not in _VALID_CLASSIFICATIONS:
        raise TaxLensError(
            "ERR-GEN-001",
            400,
            f"classification không hợp lệ — phải là một trong: {', '.join(sorted(_VALID_CLASSIFICATIONS))}",
        )

    ct = _decode_or_raise(token)

    ex = await db.get(ExceptionRecord, ct.exception_id)
    if ex is None:
        raise TaxLensError("ERR-TOKEN-001", 404, "Exception không tồn tại")

    if ex.status == "RESOLVED":
        return ConfirmSubmitResponse(
            status="ALREADY_CONFIRMED",
            exception_id=ex.id,
            classification=body.classification,
        )

    ex.human_decision = body.classification
    ex.status = "RESOLVED"
    if ex.ai_suggestion is None:
        ex.ai_suggestion = {}
    ex.ai_suggestion = {**ex.ai_suggestion, "human_classification": body.classification}
    await db.commit()

    return ConfirmSubmitResponse(
        status="CONFIRMED",
        exception_id=ex.id,
        classification=body.classification,
    )
