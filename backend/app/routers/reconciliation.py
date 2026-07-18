from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, get_current_user
from app.models.payment import PaymentAllocation
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.schemas.reconciliation import ExceptionResolveRequest, ExceptionResolveResponse
from app.services.allocation import AllocationLeg, AllocationType
from app.services.matching import MatchMethod

router = APIRouter(prefix="/reconciliation", tags=["reconciliation"])


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
