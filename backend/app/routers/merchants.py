import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.queue import run_agent_workflow
from app.core.security import TaxLensError, get_current_user
from app.models.agent import AgentRun
from app.models.merchant import Merchant
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.models.sale import Sale
from app.models.invoice import Invoice
from app.schemas.reconciliation import ReconcileRequest, ReconcileResponse

router = APIRouter(prefix="/merchants", tags=["merchants"])


@router.get("/{merchant_id}")
async def get_merchant_profile(
    merchant_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    merchant = await db.get(Merchant, merchant_id)
    if merchant is None:
        raise TaxLensError("ERR-MERCHANT-001", 404, "Merchant không tồn tại")
    return {
        "id": merchant.id,
        "name": merchant.name,
        "business_type": merchant.business_type,
        "business_category": merchant.business_category,
        "tax_id": merchant.tax_id,
        "contact_phone": merchant.contact_phone,
        "contact_email": merchant.contact_email,
        "status": merchant.status,
        "created_at": merchant.created_at.isoformat() if merchant.created_at else None,
        "updated_at": merchant.updated_at.isoformat() if merchant.updated_at else None,
    }


@router.get("/{merchant_id}/dashboard")
async def dashboard(
    merchant_id: str,
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    period_end = date(int(year) + 1, 1, 1) if int(month) == 12 else date(int(year), int(month) + 1, 1)

    tx_count = await db.scalar(
        select(func.count(BankTransaction.id)).where(
            BankTransaction.merchant_id == merchant_id,
            BankTransaction.transaction_date >= period_start,
            BankTransaction.transaction_date < period_end,
        )
    )
    sale_count = await db.scalar(
        select(func.count(Sale.id)).where(
            Sale.merchant_id == merchant_id,
            Sale.created_at >= period_start,
            Sale.created_at < period_end,
        )
    )
    invoice_count = await db.scalar(
        select(func.count(Invoice.id)).where(
            Invoice.merchant_id == merchant_id,
            Invoice.invoice_date >= period_start,
            Invoice.invoice_date < period_end,
        )
    )

    total = (tx_count or 0) + (sale_count or 0)
    matched = min(tx_count or 0, invoice_count or 0)
    missing_invoice_count = max((sale_count or 0) - (invoice_count or 0), 0)
    # #19: decimal 0-1 per spec (spec: 0.83 not 83.0)
    # NOTE: P3 dashboard.tsx uses `rate / 100` — P3 must update to `rate * 270` after this change
    rate = round(matched / total, 2) if total > 0 else 0.0

    # Exception counts from actual ExceptionRecord rows for this merchant+period
    case_result = await db.execute(
        select(ReconciliationCase).where(
            ReconciliationCase.merchant_id == merchant_id,
            ReconciliationCase.period == period,
        )
    )
    cases = case_result.scalars().all()
    case_ids = [c.id for c in cases]
    tax_rule_version = cases[0].tax_rule_version if cases else None

    exception_count = 0
    unclassified_count = 0
    if case_ids:
        exception_count = await db.scalar(
            select(func.count(ExceptionRecord.id)).where(
                ExceptionRecord.case_id.in_(case_ids),
                ExceptionRecord.status == "PENDING",
            )
        ) or 0
        unclassified_count = await db.scalar(
            select(func.count(ExceptionRecord.id)).where(
                ExceptionRecord.case_id.in_(case_ids),
                ExceptionRecord.status == "PENDING",
                ExceptionRecord.human_decision.is_(None),
            )
        ) or 0

    # Proxy for open_exceptions when no reconciliation case exists yet
    legacy_exception_proxy = missing_invoice_count
    open_ex = exception_count if case_ids else legacy_exception_proxy

    # TODO [P0-ARCHITECTURE]: active_agents reflects AgentRun rows only.
    # Until reconcile→AgentRun wire is resolved, this will always be [] for users who
    # trigger reconciliation via POST /merchants/{id}/reconcile (no AgentRun created).
    active_runs_result = await db.execute(
        select(AgentRun).where(
            AgentRun.merchant_id == merchant_id,
            AgentRun.status.in_(["PLANNING", "EXECUTING"]),
        )
    )
    active_agents = [
        {"run_id": r.id, "status": r.status, "request": (r.request_text or "")[:50]}
        for r in active_runs_result.scalars().all()
    ]

    return {
        # Legacy fields — preserved for P3 backward compat
        "total_transactions": total,
        "reconciliation_rate": rate,
        "open_exceptions": open_ex,
        "tax_ready": open_ex == 0 and missing_invoice_count == 0,
        "matched": matched,
        "pending": missing_invoice_count,
        "exceptions": open_ex,
        # Enrichment fields (#6)
        "merchant_id": merchant_id,
        "period": period,
        "exception_count": exception_count,
        "missing_invoice_count": missing_invoice_count,
        "unclassified_count": unclassified_count,
        "tax_readiness": {
            "bank_reconciliation": rate >= 0.95,
            "cash_session_closure": True,  # no merchant→CashSession path; defaults True
            "unclassified_transactions": unclassified_count == 0,
            "missing_invoices": missing_invoice_count == 0,
            "rule_version": tax_rule_version or "unknown",
            "ready": open_ex == 0 and missing_invoice_count == 0,
        },
        "active_agents": active_agents,
    }


@router.post("/{merchant_id}/reconcile", status_code=202, response_model=ReconcileResponse)
async def trigger_reconcile(
    merchant_id: str,
    body: ReconcileRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> ReconcileResponse:
    # ERR-MERCHANT-001: merchant must exist
    merchant = await db.get(Merchant, merchant_id)
    if merchant is None:
        raise TaxLensError("ERR-MERCHANT-001", 404, "Merchant không tồn tại")

    # ERR-GEN-001: period must have ended before reconciliation is possible
    year, month = (int(p) for p in body.period.split("-"))
    period_end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    if date.today() < period_end:
        raise TaxLensError("ERR-GEN-001", 400, f"Kỳ {body.period} chưa kết thúc — không thể đối soát")

    # ERR-RECON-001: check active AgentRun (NOT ReconciliationCase) for same merchant+period.
    # A case existing doesn't mean a run is active — must check AgentRun status.
    existing_run = await db.scalar(
        select(AgentRun).where(
            AgentRun.merchant_id == merchant_id,
            AgentRun.period == body.period,
            AgentRun.status.not_in(["COMPLETED", "FAILED"]),
        )
    )
    if existing_run is not None:
        raise TaxLensError(
            "ERR-RECON-001",
            409,
            f"Đang có agent run active cho kỳ {body.period} (run_id={existing_run.id})",
        )

    # ERR-RECON-002: no transactions found for this period
    period_start = date(year, month, 1)
    tx_count = await db.scalar(
        select(func.count(BankTransaction.id)).where(
            BankTransaction.merchant_id == merchant_id,
            BankTransaction.transaction_date >= period_start,
            BankTransaction.transaction_date < period_end,
        )
    )
    if not tx_count:
        raise TaxLensError(
            "ERR-RECON-002",
            422,
            f"Không tìm thấy giao dịch nào cho merchant {merchant_id} kỳ {body.period}",
        )

    # Create ReconciliationCase (kept — needed as FK parent for ExceptionRecord)
    case_id = f"CASE-{uuid.uuid4().hex[:10].upper()}"
    case = ReconciliationCase(
        id=case_id,
        merchant_id=merchant_id,
        period=body.period,
        status="OPEN",
        priority="MEDIUM",
    )
    db.add(case)

    # Create AgentRun — this is the ID returned to the client
    run_id = f"RUN-{uuid.uuid4().hex[:10].upper()}"
    agent_run = AgentRun(
        id=run_id,
        case_id=case_id,
        merchant_id=merchant_id,
        user_id=str(_user.id),
        period=body.period,
        request_text=f"Reconcile {merchant_id} kỳ {body.period}",
        status="PLANNING",
        started_at=datetime.now(timezone.utc),
    )
    db.add(agent_run)
    await db.commit()

    background_tasks.add_task(
        run_agent_workflow,
        run_id=run_id,
        case_id=case_id,
        merchant_id=merchant_id,
        period=body.period,
        request_text=agent_run.request_text,
    )

    return ReconcileResponse(run_id=run_id, status="PLANNING", plan={"steps": []})
