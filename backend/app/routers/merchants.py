import logging
import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.core.security import TaxLensError, get_current_user
from app.core.ws_manager import ws_manager
from app.models.agent import AgentRun
from app.models.merchant import Merchant
from app.models.payment import PaymentAllocation
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.models.sale import Sale
from app.models.invoice import Invoice
from app.schemas.reconciliation import ReconcileRequest, ReconcileResponse
from app.services.reconciliation import reconcile_period

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


async def _run_reconciliation(merchant_id: str, case_id: str, period: str) -> None:
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

    background_tasks.add_task(_run_reconciliation, merchant_id, case_id, body.period)

    return ReconcileResponse(run_id=case_id, status="PLANNING", plan={"steps": []})
