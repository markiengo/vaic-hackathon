"""Internal typed adapters for P1's deterministic reconciliation services.

The AsyncSession is explicit at this boundary.  Current P5 LLM-facing tools
and tracing remain in :mod:`app.tools`; they can delegate to these adapters
without replacing their public session-free signatures or audit decorator.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.agent import (
    MatchCandidate as AgentMatchCandidate,
    ReconciliationExceptionDraft,
)
from app.services.reconciliation import (
    create_exception_record,
    find_payment_reference_record,
    score_transaction_candidates,
)


async def score_match_candidates(
    session: AsyncSession,
    transaction_id: str,
    time_window_minutes: int = 60,
    *,
    known_sender_names: tuple[str, ...] = (),
    note_signals: Mapping[str, int] | None = None,
) -> list[AgentMatchCandidate]:
    """Rank sales using the canonical transaction selected by ``transaction_id``."""

    candidates = await score_transaction_candidates(
        session,
        transaction_id,
        time_window_minutes=time_window_minutes,
        known_sender_names=known_sender_names,
        note_signals=note_signals,
    )
    return [
        AgentMatchCandidate(
            sale_id=item.sale_id,
            transaction_id=transaction_id,
            score=item.display_score,
            confidence=item.confidence,
            # Keep P2's current MatchCandidate schema untouched.  The richer
            # deterministic decision data remains explicit and machine-readable
            # in reasoning until P2 evolves the shared schema on main.
            reasoning=[
                f"factor={factor.name};points={factor.points};detail={factor.detail}"
                for factor in item.factors
            ]
            + [
                f"action={item.action.value}",
                f"deterministic_score={item.deterministic_score}",
                f"display_score={item.display_score}",
                f"match_method={item.method.value}",
                f"confidence_method={item.confidence_method}",
            ]
            + [f"reason_code={code}" for code in item.reason_codes],
        )
        for item in candidates
    ]


async def find_payment_reference(
    session: AsyncSession, reference_number: str
) -> dict[str, Any] | None:
    """Return a canonical payment-intent lookup result for a valid PAY-* code."""

    result = await find_payment_reference_record(session, reference_number)
    if result is None:
        return None
    return {
        "reference": result.reference,
        "payment_intent_id": result.payment_intent_id,
        "sale_id": result.sale_id,
        "merchant_id": result.merchant_id,
        "amount": str(result.amount),
        "status": result.status,
        "expires_at": result.expires_at.isoformat(),
    }


async def create_reconciliation_exception(
    session: AsyncSession,
    case_id: str,
    merchant_id: str,
    period: str,
    exception_type: str,
    reason: str,
    ai_suggestion: Mapping[str, object] | None = None,
    *,
    transaction_id: str | None = None,
    sale_id: str | None = None,
) -> ReconciliationExceptionDraft:
    """Persist an idempotent exception under an existing reconciliation case."""

    result = await create_exception_record(
        session,
        case_id=case_id,
        merchant_id=merchant_id,
        period=period,
        exception_type=exception_type,
        reason=reason,
        ai_suggestion=ai_suggestion,
        transaction_id=transaction_id,
        sale_id=sale_id,
    )
    payload = dict(result.record.ai_suggestion or {})
    payload["record_id"] = result.record.id
    payload["created"] = result.created
    return ReconciliationExceptionDraft(
        case_id=case_id,
        merchant_id=merchant_id,
        period=period,
        exception_type=exception_type,
        reason=reason,
        ai_suggestion=payload,
    )


__all__ = [
    "create_reconciliation_exception",
    "find_payment_reference",
    "score_match_candidates",
]
