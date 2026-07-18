import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, get_current_user
from app.models.merchant import Merchant
from app.models.reconciliation import ReconciliationCase
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
) -> dict:
    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    if int(month) == 12:
        period_end = date(int(year) + 1, 1, 1)
    else:
        period_end = date(int(year), int(month) + 1, 1)

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
    pending = max((sale_count or 0) - (invoice_count or 0), 0)
    exceptions = max(pending, 0)
    rate = round((matched / total * 100), 1) if total > 0 else 0

    return {
        "total_transactions": total,
        "reconciliation_rate": rate,
        "open_exceptions": exceptions,
        "tax_ready": exceptions == 0,
        "matched": matched,
        "pending": pending,
        "exceptions": exceptions,
    }


async def _run_reconciliation(merchant_id: str, case_id: str, period: str) -> None:
    """Background task: placeholder that agent layer will replace (TODO: P2/P1)."""
    pass


@router.post("/{merchant_id}/reconcile", response_model=ReconcileResponse)
async def trigger_reconcile(
    merchant_id: str,
    body: ReconcileRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
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

    return ReconcileResponse(run_id=case_id, status="PLANNING")
