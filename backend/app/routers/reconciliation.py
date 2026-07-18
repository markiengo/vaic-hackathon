import logging
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.core.security import TaxLensError, get_current_user
from app.core.ws_manager import ws_manager
from app.models.merchant import Merchant
from app.models.payment import PaymentAllocation
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.schemas.reconciliation import ExceptionResolveRequest, ExceptionResolveResponse, ReconcileResponse
from app.services.allocation import AllocationLeg, AllocationType
from app.services.matching import MatchMethod
from app.services.reconciliation import reconcile_period

router = APIRouter(prefix="/reconciliation", tags=["reconciliation"])
logger = logging.getLogger(__name__)


class ReconciliationStartRequest(BaseModel):
    merchant_id: str
    period: str  # "YYYY-MM"
    request_text: str | None = None


async def _run_reconciliation_bg(merchant_id: str, case_id: str, period: str) -> None:
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


@router.get("/exceptions")
async def list_exceptions(
    merchant_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[dict]:
    case_result = await db.execute(
        select(ReconciliationCase).where(
            ReconciliationCase.merchant_id == merchant_id,
            ReconciliationCase.period == period,
        )
    )
    cases = case_result.scalars().all()
    if not cases:
        return []
    case_ids = [c.id for c in cases]
    ex_result = await db.execute(
        select(ExceptionRecord)
        .where(ExceptionRecord.case_id.in_(case_ids))
        .order_by(ExceptionRecord.created_at.desc())
    )
    exceptions = ex_result.scalars().all()
    return [
        {
            "id": ex.id,
            "case_id": ex.case_id,
            "bank_transaction_id": ex.bank_transaction_id,
            "sale_id": ex.sale_id,
            "exception_type": ex.exception_type,
            "ai_suggestion": ex.ai_suggestion,
            "human_decision": ex.human_decision,
            "status": ex.status,
            "created_at": ex.created_at.isoformat() if ex.created_at else None,
        }
        for ex in exceptions
    ]


@router.post("/start", status_code=202, response_model=ReconcileResponse)
async def start_reconciliation(
    body: ReconciliationStartRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> ReconcileResponse:
    merchant = await db.get(Merchant, body.merchant_id)
    if merchant is None:
        raise TaxLensError("ERR-MERCHANT-001", 404, "Merchant không tồn tại")

    existing = await db.scalar(
        select(ReconciliationCase).where(
            ReconciliationCase.merchant_id == body.merchant_id,
            ReconciliationCase.period == body.period,
        )
    )
    if existing is not None:
        raise TaxLensError(
            "ERR-RECON-001",
            409,
            f"Case đối soát cho kỳ {body.period} đã tồn tại (case_id={existing.id})",
        )

    year, month = (int(p) for p in body.period.split("-"))
    period_end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    if date.today() < period_end:
        # Period not ended → no complete data yet → ERR-GEN-001 (bad request)
        raise TaxLensError("ERR-GEN-001", 400, f"Kỳ {body.period} chưa kết thúc — không thể đối soát")

    # ERR-RECON-002: no transactions found for this merchant+period
    period_start = date(year, month, 1)
    tx_count = await db.scalar(
        select(func.count(BankTransaction.id)).where(
            BankTransaction.merchant_id == body.merchant_id,
            BankTransaction.transaction_date >= period_start,
            BankTransaction.transaction_date < period_end,
        )
    )
    if not tx_count:
        raise TaxLensError(
            "ERR-RECON-002",
            422,
            f"Không tìm thấy giao dịch nào cho merchant {body.merchant_id} kỳ {body.period}",
        )

    case_id = f"CASE-{uuid.uuid4().hex[:10].upper()}"
    case = ReconciliationCase(
        id=case_id,
        merchant_id=body.merchant_id,
        period=body.period,
        status="OPEN",
        priority="MEDIUM",
    )
    db.add(case)
    await db.commit()

    background_tasks.add_task(_run_reconciliation_bg, body.merchant_id, case_id, body.period)
    return ReconcileResponse(run_id=case_id, status="PLANNING", plan={"steps": []})


@router.get("/{case_id}")
async def get_reconciliation_result(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    c = await db.get(ReconciliationCase, case_id)
    if c is None:
        raise TaxLensError("ERR-RUN-001", 404, "Case/run không tồn tại")
    ex_result = await db.execute(
        select(ExceptionRecord).where(ExceptionRecord.case_id == case_id)
    )
    exceptions = ex_result.scalars().all()
    pending = [e for e in exceptions if e.status == "PENDING"]

    # Count actual matched transactions from PaymentAllocation
    matched_count = await db.scalar(
        select(func.count(func.distinct(PaymentAllocation.bank_transaction_id))).where(
            PaymentAllocation.bank_transaction_id.isnot(None)
        )
    ) or 0

    # Use summary from case if available, otherwise derive from live data
    summary = c.summary or {}
    matched = summary.get("matched", matched_count)
    transactions_scanned = summary.get("transactions_scanned", 0)
    unmatched = summary.get("no_match", len(pending))
    ambiguous = summary.get("ambiguous", 0)
    review_required = summary.get("review_required", 0)
    cash_discrepancies = summary.get("cash_discrepancies", 0)

    # Count exceptions by type for missing_invoice_cases
    missing_invoice_count = sum(1 for e in exceptions if e.exception_type == "NO_MATCH")

    return {
        "run_id": c.id,
        "status": c.status,
        "matched": matched,
        "unmatched": unmatched,
        "duplicate_candidates": ambiguous,
        "missing_invoice_cases": missing_invoice_count,
        "transactions_scanned": transactions_scanned,
        "review_required": review_required,
        "cash_discrepancies": cash_discrepancies,
        "exceptions": [
            {
                "id": ex.id,
                "exception_type": ex.exception_type,
                "bank_transaction_id": ex.bank_transaction_id,
                "sale_id": ex.sale_id,
                "ai_suggestion": ex.ai_suggestion,
                "status": ex.status,
            }
            for ex in exceptions
        ],
        "tax_readiness": {
            "rule_version": c.tax_rule_version or "unknown",
            "ready": len(pending) == 0 and c.status == "COMPLETED",
        },
    }


# TODO Q-A4: Path currently matches P3's api.ts (/reconciliation/exceptions/{id}/resolve).
# API spec §4 uses /exceptions/{id}/resolve (no /reconciliation prefix). Align with P3
# before final integration — do NOT change path unilaterally.
@router.post("/exceptions/{exception_id}/resolve", response_model=ExceptionResolveResponse)
async def resolve_exception(
    exception_id: int,
    body: ExceptionResolveRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ExceptionResolveResponse:
    ex = await db.get(ExceptionRecord, exception_id)
    if ex is None:
        raise TaxLensError("ERR-EXCEPTION-001", 404, "Exception không tồn tại")

    if ex.status == "RESOLVED":
        raise TaxLensError("ERR-EXCEPTION-002", 409, "Exception đã được giải quyết")

    if body.decision == "approved" and ex.bank_transaction_id and ex.sale_id:
        # Build AllocationLeg documenting intent (P1 wires full allocate_payment
        # + DBAllocationWriter once ORM→domain snapshot layer is ready).
        tx_row = await db.get(BankTransaction, ex.bank_transaction_id)
        if tx_row is not None:
            _leg = AllocationLeg(
                sale_id=ex.sale_id,
                amount=tx_row.amount,
                allocation_type=AllocationType.PAYMENT,
                match_method=MatchMethod.MANUAL,
                confidence=None,
            )
            alloc = PaymentAllocation(
                bank_transaction_id=ex.bank_transaction_id,
                sale_id=ex.sale_id,
                amount=_leg.amount,
                allocation_type=_leg.allocation_type.value,
                match_method=_leg.match_method.value,
                confidence=None,
            )
            db.add(alloc)

    ex.human_decision = body.decision
    ex.human_decision_by = current_user.id
    ex.human_decision_at = datetime.now(timezone.utc)
    ex.status = "RESOLVED"
    if body.classification:
        if ex.ai_suggestion is None:
            ex.ai_suggestion = {}
        ex.ai_suggestion = {**ex.ai_suggestion, "human_classification": body.classification}

    await db.commit()

    return ExceptionResolveResponse(
        exception_id=ex.id,
        status=ex.status,
        decision=ex.human_decision,
        classification=body.classification,
        resolved_by=ex.human_decision_by,
        resolved_at=ex.human_decision_at.isoformat() if ex.human_decision_at else None,
    )
