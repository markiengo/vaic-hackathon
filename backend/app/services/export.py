"""Draft data export — JSON/CSV, and a MISA-compatible mock accounting export.

Per docs/05-domain/05-compliance.md § Draft export: includes merchant info,
reconciled transactions/sales/allocations/tax classifications, and the rule
version; excludes unresolved exceptions; always labeled as a draft, never a
real filing.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.payment import PaymentAllocation
from app.models.sale import Sale
from app.models.tax import TaxClassification
from app.models.transaction import BankTransaction

DRAFT_LABEL = "DRAFT — Không phải tờ khai thuế"


def _decimal_to_str(value: Decimal | None) -> str | None:
    return str(value) if value is not None else None


def period_bounds(period: str) -> tuple[datetime, datetime]:
    year, month = (int(part) for part in period.split("-"))
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end_year, end_month = (year + 1, 1) if month == 12 else (year, month + 1)
    end = datetime(end_year, end_month, 1, tzinfo=timezone.utc)
    return start, end


@dataclass(frozen=True)
class DraftExportData:
    label: str
    merchant_id: str
    period: str
    rule_version: str
    generated_at: str
    sales: list[dict]
    bank_transactions: list[dict]
    allocations: list[dict]
    tax_classifications: list[dict]


async def collect_draft_export_data(
    db: AsyncSession, merchant_id: str, period: str, rule_version: str
) -> DraftExportData:
    start, end = period_bounds(period)

    sales_result = await db.execute(
        select(Sale).where(
            Sale.merchant_id == merchant_id,
            Sale.created_at >= start,
            Sale.created_at < end,
            Sale.payment_status.in_(["PAID", "REFUNDED"]),
        )
    )
    sales = sales_result.scalars().all()
    sale_ids = [sale.id for sale in sales]

    tx_result = await db.execute(
        select(BankTransaction).where(
            BankTransaction.merchant_id == merchant_id,
            BankTransaction.transaction_date >= start,
            BankTransaction.transaction_date < end,
        )
    )
    transactions = tx_result.scalars().all()

    allocations: list[PaymentAllocation] = []
    if sale_ids:
        alloc_result = await db.execute(
            select(PaymentAllocation).where(PaymentAllocation.sale_id.in_(sale_ids))
        )
        allocations = alloc_result.scalars().all()

    invoice_result = await db.execute(
        select(Invoice.sale_id, Invoice.invoice_number).where(
            Invoice.merchant_id == merchant_id,
            Invoice.sale_id.in_(sale_ids) if sale_ids else Invoice.sale_id.is_(None),
        )
    )
    invoice_numbers = {row[0]: row[1] for row in invoice_result.all()}

    classification_result = await db.execute(
        select(TaxClassification).where(TaxClassification.merchant_id == merchant_id)
    )
    classifications = classification_result.scalars().all()

    return DraftExportData(
        label=DRAFT_LABEL,
        merchant_id=merchant_id,
        period=period,
        rule_version=rule_version,
        generated_at=datetime.now(timezone.utc).isoformat(),
        sales=[
            {
                "sale_id": sale.id,
                "net_amount": _decimal_to_str(sale.net_amount),
                "payment_status": sale.payment_status,
                "invoice_number": invoice_numbers.get(sale.id),
            }
            for sale in sales
        ],
        bank_transactions=[
            {
                "id": tx.id,
                "amount": _decimal_to_str(tx.amount),
                "transaction_date": tx.transaction_date.isoformat() if tx.transaction_date else None,
                "source": tx.source,
            }
            for tx in transactions
        ],
        allocations=[
            {
                "bank_transaction_id": allocation.bank_transaction_id,
                "sale_id": allocation.sale_id,
                "amount": _decimal_to_str(allocation.amount),
                "allocation_type": allocation.allocation_type,
                "match_method": allocation.match_method,
                "confidence": _decimal_to_str(allocation.confidence),
            }
            for allocation in allocations
        ],
        tax_classifications=[
            {
                "transaction_id": classification.transaction_id,
                "classification": classification.classification,
                "classified_by": classification.classified_by,
                "confidence": _decimal_to_str(classification.confidence),
            }
            for classification in classifications
        ],
    )


def to_json_dict(data: DraftExportData) -> dict:
    return {
        "label": data.label,
        "merchant_id": data.merchant_id,
        "period": data.period,
        "rule_version": data.rule_version,
        "generated_at": data.generated_at,
        "sales": data.sales,
        "bank_transactions": data.bank_transactions,
        "allocations": data.allocations,
        "tax_classifications": data.tax_classifications,
    }


def to_csv_text(data: DraftExportData) -> str:
    """Flatten sales (the primary reconciled-revenue rows) into one CSV.

    Bank transactions/allocations/classifications are export metadata rather
    than per-row revenue detail, so the CSV — which accounting tools import
    as a flat sheet — carries the sales rows; the JSON export carries the
    full structured breakdown.
    """

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["# " + data.label])
    writer.writerow(["merchant_id", data.merchant_id])
    writer.writerow(["period", data.period])
    writer.writerow(["rule_version", data.rule_version])
    writer.writerow(["generated_at", data.generated_at])
    writer.writerow([])
    writer.writerow(["sale_id", "net_amount", "payment_status", "invoice_number"])
    for sale in data.sales:
        writer.writerow(
            [sale["sale_id"], sale["net_amount"], sale["payment_status"], sale["invoice_number"] or ""]
        )
    return buffer.getvalue()


@dataclass(frozen=True)
class MisaExportRow:
    sale_id: str
    invoice_number: str | None
    net_amount: str | None
    payment_status: str


def to_misa_csv_text(data: DraftExportData) -> str:
    """MISA-compatible mock export (docs/03-engineering/05-integration.md
    § SHB Case Management Mock / MISA sandbox — mock format only, no real
    integration in MVP)."""

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["MaChungTu", "SoHoaDon", "SoTien", "TrangThai", "KyBaoCao"])
    for sale in data.sales:
        writer.writerow(
            [sale["sale_id"], sale["invoice_number"] or "", sale["net_amount"], sale["payment_status"], data.period]
        )
    return buffer.getvalue()
