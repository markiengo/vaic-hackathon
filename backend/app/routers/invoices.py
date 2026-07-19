from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.invoice import Invoice
from app.models.sale import Sale

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("")
async def list_invoices(
    merchant_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM"),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    if int(month) == 12:
        period_end = date(int(year) + 1, 1, 1)
    else:
        period_end = date(int(year), int(month) + 1, 1)

    # Build invoice coverage: left-join paid sales with their invoices
    inv_alias = Invoice.__table__.alias("inv")
    stmt = (
        select(
            Sale.id.label("sale_id"),
            Sale.net_amount.label("amount"),
            Sale.payment_status.label("payment_status"),
            Sale.invoice_status.label("sale_invoice_status"),
            Sale.created_at.label("created_at"),
            inv_alias.c.id.label("invoice_id"),
            inv_alias.c.invoice_number.label("invoice_number"),
            inv_alias.c.source.label("provider"),
            inv_alias.c.invoice_date.label("issued_at"),
            inv_alias.c.status.label("invoice_status"),
        )
        .outerjoin(inv_alias, inv_alias.c.sale_id == Sale.id)
        .where(
            Sale.merchant_id == merchant_id,
            Sale.created_at >= period_start,
            Sale.created_at < period_end,
            Sale.payment_status == "PAID",
        )
        .order_by(Sale.created_at.desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    records = []
    for row in rows:
        has_invoice = row.invoice_id is not None
        readiness_blocker = not has_invoice
        rec = {
            "sale_id": row.sale_id,
            "amount": float(row.amount) if row.amount else 0,
            "payment_status": row.payment_status or "PAID",
            "invoice_status": "linked" if has_invoice else "missing",
            "invoice_id": row.invoice_id,
            "invoice_number": row.invoice_number,
            "provider": row.provider,
            "issued_at": row.issued_at.isoformat() if row.issued_at else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "readiness_blocker": readiness_blocker,
        }
        records.append(rec)

    missing_count = sum(1 for r in records if r["readiness_blocker"])

    # Apply status filter after coverage computation
    if status == "missing":
        filtered = [r for r in records if r["readiness_blocker"]]
    elif status == "linked":
        filtered = [r for r in records if not r["readiness_blocker"]]
    else:
        filtered = records

    return {
        "merchant_id": merchant_id,
        "period": period,
        "missing_count": missing_count,
        "total": len(records),
        "items": filtered,
        "records": filtered,
    }
