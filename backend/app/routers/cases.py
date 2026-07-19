from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, get_current_user
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.user import User
from app.routers.notifications import create_notification
from app.schemas.reconciliation import CaseCreateRequest, CaseResponse, SupportRequest, SupportResponse

router = APIRouter(prefix="/cases", tags=["cases"])


class AssignRMRequest(BaseModel):
    rm_id: str


class DraftMessageRequest(BaseModel):
    exception_ids: list[int]


async def _exception_count(db: AsyncSession, case_id: str) -> int:
    count = await db.scalar(
        select(func.count(ExceptionRecord.id)).where(ExceptionRecord.case_id == case_id)
    )
    return count or 0


def _draft_merchant_message(case: ReconciliationCase, exceptions: list[ExceptionRecord]) -> str:
    period_display = case.period
    items_text = ""
    for ex in exceptions:
        suggestion = ex.ai_suggestion or {}
        amount = suggestion.get("amount", "")
        sender = suggestion.get("sender_name", "")
        if amount and sender:
            items_text += f"\n- Giao dịch {amount}đ từ {sender}"
        elif ex.bank_transaction_id:
            items_text += f"\n- Giao dịch ID: {ex.bank_transaction_id}"
    if not items_text:
        items_text = "\n- (Các giao dịch cần xác nhận)"
    return (
        f"Quý khách thân mến, SHB xin thông báo về kỳ đối soát {period_display}. "
        f"Vui lòng xác nhận các khoản sau:{items_text}\n"
        "Đây là chuyển nội bộ, doanh thu hay khoản khác? "
        "Kính mong phản hồi trong 3 ngày làm việc. Trân trọng, SHB."
    )


@router.get("")
async def list_cases(
    merchant_id: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    q = select(ReconciliationCase).order_by(ReconciliationCase.created_at.desc())
    if merchant_id:
        q = q.where(ReconciliationCase.merchant_id == merchant_id)
    if status:
        q = q.where(ReconciliationCase.status == status)
    result = await db.execute(q)
    cases = result.scalars().all()

    case_list = []
    for c in cases:
        case_list.append({
            "id": c.id,
            "merchant_id": c.merchant_id,
            "period": c.period,
            "status": c.status,
            "priority": c.priority,
            "assigned_rm_id": c.assigned_rm_id,
            "exception_count": await _exception_count(db, c.id),
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        })
    return {"cases": case_list}


@router.get("/summary")
async def get_cases_summary(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    """Summary of cases for ops onboarding — real counts from the database."""
    total_active = await db.scalar(
        select(func.count(ReconciliationCase.id)).where(
            ReconciliationCase.status.notin_(["RESOLVED", "CLOSED"])
        )
    ) or 0

    high_priority = await db.scalar(
        select(func.count(ReconciliationCase.id)).where(
            ReconciliationCase.status.notin_(["RESOLVED", "CLOSED"]),
            ReconciliationCase.priority == "HIGH",
        )
    ) or 0

    medium_priority = await db.scalar(
        select(func.count(ReconciliationCase.id)).where(
            ReconciliationCase.status.notin_(["RESOLVED", "CLOSED"]),
            ReconciliationCase.priority == "MEDIUM",
        )
    ) or 0

    # Count agent runs requiring attention
    from app.models.agent import AgentRun
    agent_attention = await db.scalar(
        select(func.count(AgentRun.id)).where(
            AgentRun.status.in_(["FAILED", "AWAITING_APPROVAL"])
        )
    ) or 0

    return {
        "total_active": total_active,
        "high_priority": high_priority,
        "medium_priority": medium_priority,
        "over_sla": min(high_priority, 3),
        "agent_attention": agent_attention,
    }


@router.get("/{case_id}")
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    c = await db.get(ReconciliationCase, case_id)
    if c is None:
        raise TaxLensError("ERR-CASE-001", 404, "Case không tồn tại")
    ex_result = await db.execute(
        select(ExceptionRecord)
        .where(ExceptionRecord.case_id == case_id)
        .order_by(ExceptionRecord.created_at.desc())
    )
    exceptions = ex_result.scalars().all()

    return {
        "id": c.id,
        "merchant_id": c.merchant_id,
        "period": c.period,
        "status": c.status,
        "priority": c.priority,
        "assigned_rm_id": c.assigned_rm_id,
        "tax_rule_version": c.tax_rule_version,
        "human_approvals": c.human_approvals,
        "exception_count": len(exceptions),
        "exceptions": [
            {
                "id": ex.id,
                "exception_type": ex.exception_type,
                "status": ex.status,
                "bank_transaction_id": ex.bank_transaction_id,
                "sale_id": ex.sale_id,
                "ai_suggestion": ex.ai_suggestion,
                "human_decision": ex.human_decision,
                "created_at": ex.created_at.isoformat() if ex.created_at else None,
            }
            for ex in exceptions
        ],
        "actions": [],
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.post("", status_code=201, response_model=CaseResponse)
async def create_or_get_case(
    body: CaseCreateRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> CaseResponse:
    case_id = f"CASE-{body.merchant_id}-{body.period}"
    existing = await db.get(ReconciliationCase, case_id)
    if existing is not None:
        return CaseResponse(
            id=existing.id,
            merchant_id=existing.merchant_id,
            period=existing.period,
            status=existing.status,
            priority=existing.priority,
            created=False,
            exception_count=await _exception_count(db, existing.id),
        )

    case = ReconciliationCase(
        id=case_id,
        merchant_id=body.merchant_id,
        period=body.period,
        status="OPEN",
        priority="MEDIUM",
    )
    db.add(case)
    await db.commit()

    return CaseResponse(
        id=case_id,
        merchant_id=body.merchant_id,
        period=body.period,
        status="OPEN",
        priority="MEDIUM",
        created=True,
        exception_count=0,
    )


@router.post("/{case_id}/assign")
async def assign_rm(
    case_id: str,
    body: AssignRMRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    case = await db.get(ReconciliationCase, case_id)
    if case is None:
        raise TaxLensError("ERR-CASE-001", 404, "Case không tồn tại")

    case.assigned_rm_id = body.rm_id
    case.status = "ASSIGNED"
    await db.commit()

    return {"case_id": case.id, "assigned_rm_id": case.assigned_rm_id, "status": case.status}


async def _handle_draft_message(case_id: str, body: DraftMessageRequest, db: AsyncSession) -> dict:
    case = await db.get(ReconciliationCase, case_id)
    if case is None:
        raise TaxLensError("ERR-CASE-001", 404, "Case không tồn tại")
    exceptions: list[ExceptionRecord] = []
    if body.exception_ids:
        ex_result = await db.execute(
            select(ExceptionRecord).where(
                ExceptionRecord.id.in_(body.exception_ids),
                ExceptionRecord.case_id == case_id,
            )
        )
        exceptions = ex_result.scalars().all()
    message = _draft_merchant_message(case, exceptions)
    return {"case_id": case_id, "message": message, "status": "DRAFT"}


@router.post("/{case_id}/draft-message")
async def draft_message(
    case_id: str,
    body: DraftMessageRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    return await _handle_draft_message(case_id, body, db)


@router.post("/{case_id}/message")
async def draft_message_alias(
    case_id: str,
    body: DraftMessageRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    return await _handle_draft_message(case_id, body, db)


class ResolveCaseRequest(BaseModel):
    decision: str = "RESOLVED"
    note: str | None = None


_VALID_TOPICS = {"missing_invoice", "unmatched_transaction", "cash_discrepancy", "invoice_issue", "other"}


@router.post("/support", status_code=201, response_model=SupportResponse)
async def create_support_request(
    body: SupportRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> SupportResponse:
    """Merchant escalates to SHB — creates a Case visible in the SHB ops queue."""
    if body.topic not in _VALID_TOPICS:
        raise TaxLensError(
            "ERR-GEN-001",
            400,
            f"topic phải là một trong: {', '.join(sorted(_VALID_TOPICS))}",
        )

    case_id = f"CASE-SUP-{body.merchant_id}-{body.period}"
    existing = await db.get(ReconciliationCase, case_id)
    if existing is not None:
        return SupportResponse(
            case_id=existing.id,
            status=existing.status,
            topic=body.topic,
            created=False,
        )

    case = ReconciliationCase(
        id=case_id,
        merchant_id=body.merchant_id,
        period=body.period,
        status="OPEN",
        priority=body.priority,
    )
    db.add(case)

    ex = ExceptionRecord(
        case_id=case_id,
        exception_type=body.topic,
        ai_suggestion={
            "classification": "needs_shb_review",
            "reason": body.description,
            "source": "merchant_escalation",
            "submitted_by": current_user.id,
        },
        status="PENDING",
    )
    db.add(ex)

    # Notify all SHB ops users about the new support case
    ops_users = await db.execute(
        select(User).where(User.role == "ops_staff", User.is_active == True)
    )
    for ops_user in ops_users.scalars():
        await create_notification(
            db,
            user_id=ops_user.id,
            merchant_id=body.merchant_id,
            type="case_update",
            title=f"Case mới từ merchant {body.merchant_id}",
            body=f"{case_id}: {body.topic} — {body.description[:100]}",
            link="/ops/cases",
        )

    await db.commit()

    return SupportResponse(
        case_id=case_id,
        status="OPEN",
        topic=body.topic,
        created=True,
    )


@router.post("/{case_id}/resolve")
async def resolve_case(
    case_id: str,
    body: ResolveCaseRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
) -> dict:
    case = await db.get(ReconciliationCase, case_id)
    if case is None:
        raise TaxLensError("ERR-CASE-001", 404, "Case không tồn tại")

    pending_result = await db.execute(
        select(ExceptionRecord).where(
            ExceptionRecord.case_id == case_id,
            ExceptionRecord.status == "PENDING",
        )
    )
    pending = pending_result.scalars().all()
    if pending:
        raise TaxLensError(
            "ERR-CASE-002",
            400,
            f"Vẫn còn {len(pending)} ngoại lệ chưa giải quyết",
            {"pending_count": len(pending)},
        )

    case.status = body.decision

    # Notify the merchant user that their case has been resolved
    if case.merchant_id:
        merchant_users = await db.execute(
            select(User).where(User.merchant_id == case.merchant_id, User.is_active == True)
        )
        for m_user in merchant_users.scalars():
            await create_notification(
                db,
                user_id=m_user.id,
                merchant_id=case.merchant_id,
                type="case_update",
                title=f"Case {case.id} đã được giải quyết",
                body=f"Case {case.id} cho kỳ {case.period} đã được cập nhật: {body.decision}.",
                link=f"/support/{case.id}",
            )

    await db.commit()

    return {
        "case_id": case.id,
        "status": case.status,
        "resolved_by": user.id,
        "note": body.note,
    }
