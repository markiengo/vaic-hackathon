import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, get_current_user
from app.models.merchant import Merchant
from app.models.payment import PaymentAllocation
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.schemas.reconciliation import ExceptionResolveRequest, ExceptionResolveResponse, ReconcileResponse
from app.services.allocation import AllocationLeg, AllocationType
from app.services.matching import MatchMethod

router = APIRouter(prefix="/reconciliation", tags=["reconciliation"])


class ReconciliationStartRequest(BaseModel):
    merchant_id: str
    period: str  # "YYYY-MM"
    request_text: str | None = None


async def _noop_agent_run(merchant_id: str, case_id: str, period: str) -> None:
    pass


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


@router.post("/start", response_model=ReconcileResponse)
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
        raise TaxLensError("ERR-RECON-002", 422, f"Kỳ {body.period} chưa kết thúc — không thể đối soát")

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

    background_tasks.add_task(_noop_agent_run, body.merchant_id, case_id, body.period)
    return ReconcileResponse(run_id=case_id, status="QUEUED")


@router.get("/{case_id}")
async def get_reconciliation_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    c = await db.get(ReconciliationCase, case_id)
    if c is None:
        raise TaxLensError("ERR-CASE-001", 404, "Case không tồn tại")
    return {
        "id": c.id,
        "merchant_id": c.merchant_id,
        "period": c.period,
        "status": c.status,
        "priority": c.priority,
        "assigned_rm_id": c.assigned_rm_id,
        "tax_rule_version": c.tax_rule_version,
        "human_approvals": c.human_approvals,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
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
    )
