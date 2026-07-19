"""Shared background task for reconciliation.

Used by both /reconciliation/start and /merchants/{id}/reconcile endpoints.
"""
import logging

from app.core.database import AsyncSessionLocal
from app.core.ws_manager import ws_manager
from app.models.reconciliation import ReconciliationCase
from app.services.reconciliation import reconcile_period

logger = logging.getLogger(__name__)


async def run_reconciliation_bg(merchant_id: str, case_id: str, period: str) -> None:
    """Background task: run real reconciliation and update case."""
    try:
        async with AsyncSessionLocal() as session:
            summary = await reconcile_period(
                session,
                case_id=case_id,
                merchant_id=merchant_id,
                period=period,
            )
            case = await session.get(ReconciliationCase, case_id)
            if case is not None:
                case.status = "COMPLETED"
                case.summary = {
                    "transactions_scanned": summary.transactions_scanned,
                    "matched": summary.matched,
                    "exceptions": summary.exceptions,
                    "ambiguous": summary.ambiguous,
                    "no_match": summary.no_match,
                    "review_required": summary.review_required,
                    "cash_discrepancies": summary.cash_discrepancies,
                    "matched_transaction_ids": list(summary.matched_transaction_ids),
                    "exception_ids": list(summary.exception_ids),
                }
            await session.commit()
        await ws_manager.broadcast({
            "type": "reconciliation_completed",
            "merchant_id": merchant_id,
            "case_id": case_id,
            "period": period,
        })
    except Exception as exc:
        logger.exception("Reconciliation background task failed for case %s", case_id)
        async with AsyncSessionLocal() as session:
            case = await session.get(ReconciliationCase, case_id)
            if case is not None:
                case.status = "FAILED"
                case.summary = {"error": str(exc)}
            await session.commit()
