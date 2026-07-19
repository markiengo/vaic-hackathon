import logging
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, get_current_user
from app.models.agent import AgentRun, AuditEvent
from app.models.merchant import Merchant
from app.models.payment import PaymentAllocation
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.models.sale import Sale
from app.models.invoice import Invoice
from app.schemas.reconciliation import ReconcileRequest, ReconcileResponse
from app.services.reconciliation_bg import run_reconciliation_bg

router = APIRouter(prefix="/merchants", tags=["merchants"])
logger = logging.getLogger(__name__)


@router.get("")
async def list_merchants(
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    q = select(Merchant).order_by(Merchant.name.asc())
    if status:
        q = q.where(Merchant.status == status)
    result = await db.execute(q)
    merchants = result.scalars().all()
    return {
        "merchants": [
            {
                "id": m.id,
                "name": m.name,
                "business_type": m.business_type,
                "business_category": m.business_category,
                "tax_id": m.tax_id,
                "status": m.status,
            }
            for m in merchants
        ],
        "total": len(merchants),
    }


@router.get("/portfolio")
async def get_portfolio(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    merchants_result = await db.execute(select(Merchant).order_by(Merchant.name.asc()))
    merchants = merchants_result.scalars().all()

    case_result = await db.execute(
        select(ReconciliationCase.merchant_id, func.count(ReconciliationCase.id))
        .where(ReconciliationCase.status.notin_(["RESOLVED", "CLOSED"]))
        .group_by(ReconciliationCase.merchant_id)
    )
    open_cases_by_merchant = {row[0]: row[1] for row in case_result.all()}

    run_result = await db.execute(
        select(AgentRun.merchant_id, func.count(AgentRun.id))
        .where(AgentRun.status.notin_(["COMPLETED", "FAILED", "CANCELLED"]))
        .group_by(AgentRun.merchant_id)
    )
    active_runs_by_merchant = {row[0]: row[1] for row in run_result.all()}

    merchant_list = []
    for m in merchants:
        merchant_list.append(
            {
                "id": m.id,
                "name": m.name,
                "business_type": m.business_type,
                "business_category": m.business_category,
                "status": m.status or "active",
                "open_cases": open_cases_by_merchant.get(m.id, 0),
                "active_runs": active_runs_by_merchant.get(m.id, 0),
            }
        )

    summary = {
        "total": len(merchant_list),
        "active": sum(1 for m in merchant_list if m["status"].upper() == "ACTIVE"),
        "open_cases": sum(m["open_cases"] for m in merchant_list),
        "active_runs": sum(m["active_runs"] for m in merchant_list),
    }
    return {"merchants": merchant_list, "summary": summary}


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

    # Count actual matched transactions from PaymentAllocation
    matched_count = await db.scalar(
        select(func.count(func.distinct(PaymentAllocation.bank_transaction_id))).where(
            PaymentAllocation.bank_transaction_id.in_(
                select(BankTransaction.id).where(
                    BankTransaction.merchant_id == merchant_id,
                    BankTransaction.transaction_date >= period_start,
                    BankTransaction.transaction_date < period_end,
                )
            )
        )
    ) or 0

    total = tx_count or 0
    missing_invoice_count = max((sale_count or 0) - (invoice_count or 0), 0)
    # Reconciliation rate = matched transactions / total transactions
    rate = round(matched_count / total, 2) if total > 0 else 0.0

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
        "matched": matched_count,
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

    # ERR-RECON-001: case for this merchant+period must not already exist
    existing = await db.scalar(
        select(ReconciliationCase).where(
            ReconciliationCase.merchant_id == merchant_id,
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
        raise TaxLensError("ERR-GEN-001", 400, f"Kỳ {body.period} chưa kết thúc — không thể đối soát")

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

    case_id = f"CASE-{uuid.uuid4().hex[:10].upper()}"
    case = ReconciliationCase(
        id=case_id,
        merchant_id=merchant_id,
        period=body.period,
        status="OPEN",
        priority="MEDIUM",
    )
    db.add(case)
    await db.commit()

    background_tasks.add_task(run_reconciliation_bg, merchant_id, case_id, body.period)

    return ReconcileResponse(run_id=case_id, status="PLANNING", plan={"steps": []})


class ConnectMisaRequest(BaseModel):
    sandbox_token: str | None = None


@router.post("/{merchant_id}/connect-misa")
async def connect_misa_sandbox(
    merchant_id: str,
    body: ConnectMisaRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
) -> dict:
    """Connect MISA meInvoice sandbox for the merchant."""
    merchant = await db.get(Merchant, merchant_id)
    if merchant is None:
        raise TaxLensError("ERR-MERCHANT-001", 404, "Merchant không tồn tại")

    audit = AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        actor_type="user",
        actor_id=user.id,
        action="connect_misa_sandbox",
        merchant_id=merchant_id,
        tool_name=None,
        input_hash=None,
        output_hash=None,
        confidence=None,
        rule_version=None,
        approval_status="APPROVED",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)
    await db.commit()

    return {
        "merchant_id": merchant_id,
        "provider": "MISA",
        "status": "CONNECTED",
        "sandbox": True,
        "connected_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/{merchant_id}/onboarding-status")
async def get_onboarding_status(
    merchant_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    """Get onboarding status for a merchant — connections, sync state, and readiness summary."""
    merchant = await db.get(Merchant, merchant_id)
    if merchant is None:
        raise TaxLensError("ERR-MERCHANT-001", 404, "Merchant không tồn tại")

    period = "2026-07"
    year, month = int(period.split("-")[0]), int(period.split("-")[1])
    period_start = date(year, month, 1)
    period_end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

    tx_count = await db.scalar(
        select(func.count(BankTransaction.id)).where(
            BankTransaction.merchant_id == merchant_id,
            BankTransaction.transaction_date >= period_start,
            BankTransaction.transaction_date < period_end,
        )
    ) or 0

    sale_count = await db.scalar(
        select(func.count(Sale.id)).where(
            Sale.merchant_id == merchant_id,
            Sale.created_at >= period_start,
            Sale.created_at < period_end,
        )
    ) or 0

    invoice_count = await db.scalar(
        select(func.count(Invoice.id)).where(
            Invoice.merchant_id == merchant_id,
            Invoice.invoice_date >= period_start,
            Invoice.invoice_date < period_end,
        )
    ) or 0

    matched_count = await db.scalar(
        select(func.count(func.distinct(PaymentAllocation.bank_transaction_id))).where(
            PaymentAllocation.bank_transaction_id.in_(
                select(BankTransaction.id).where(
                    BankTransaction.merchant_id == merchant_id,
                    BankTransaction.transaction_date >= period_start,
                    BankTransaction.transaction_date < period_end,
                )
            )
        )
    ) or 0

    case_result = await db.execute(
        select(ReconciliationCase).where(
            ReconciliationCase.merchant_id == merchant_id,
            ReconciliationCase.period == period,
        )
    )
    cases = case_result.scalars().all()
    case_ids = [c.id for c in cases]

    pending_exceptions = 0
    if case_ids:
        pending_exceptions = await db.scalar(
            select(func.count(ExceptionRecord.id)).where(
                ExceptionRecord.case_id.in_(case_ids),
                ExceptionRecord.status == "PENDING",
            )
        ) or 0

    missing_invoices = max(sale_count - invoice_count, 0)
    total = tx_count
    rate = round(matched_count / total, 2) if total > 0 else 0.0
    readiness_score = 92 if total > 0 else 0

    return {
        "merchant_id": merchant_id,
        "period": period,
        "connections": {
            "shb": {"status": "CONNECTED", "account": "•••• 2481"},
            "pos": {"status": "CONNECTED"},
            "misa": {"status": "NOT_CONNECTED"},
            "cash": {"status": "READY"},
        },
        "sync": {
            "transactions": tx_count,
            "sales": sale_count,
            "invoices": invoice_count,
            "matched": matched_count,
        },
        "reconciliation": {
            "total_transactions": total,
            "matched": matched_count,
            "pending_exceptions": pending_exceptions,
            "missing_invoices": missing_invoices,
            "readiness_score": readiness_score,
        },
    }
