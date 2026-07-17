"""Mock e-invoice provider adapter.

MVP status is "mock provider" (see ``docs/03-engineering/05-integration.md``
§ Invoice Mock Adapter): there is no real e-invoice sandbox integration, so
this module simulates the create/retrieve contract a real provider would
expose, writing directly to the ``invoices`` table. Invoices can exist
without a linked sale (``sale_id IS NULL``) — a real e-invoice system is a
separate source of truth from POS/bank data, which is exactly the kind of
cross-source gap TaxLens is meant to surface.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice

SOURCE = "mock_einvoice"


def _generate_invoice_number(sequence: int) -> str:
    # Realistic-looking Vietnamese e-invoice number: template "C" + 8 digits.
    return f"C{sequence:08d}"


async def create_invoice(
    db: AsyncSession,
    *,
    merchant_id: str,
    amount: Decimal,
    sale_id: str | None = None,
    invoice_date: datetime | None = None,
    invoice_number: str | None = None,
    status: str = "ISSUED",
) -> Invoice:
    """Create a mock e-invoice, optionally linked to a sale."""

    sequence = await _next_sequence(db)
    record = Invoice(
        id=f"INV-{uuid.uuid4().hex[:10].upper()}",
        sale_id=sale_id,
        merchant_id=merchant_id,
        invoice_number=invoice_number or _generate_invoice_number(sequence),
        amount=amount,
        invoice_date=invoice_date or datetime.now(timezone.utc),
        status=status,
        source=SOURCE,
        source_id=f"MOCKINV-{uuid.uuid4().hex[:12]}",
    )
    db.add(record)
    await db.flush()
    return record


async def _next_sequence(db: AsyncSession) -> int:
    from sqlalchemy import func

    count = (await db.execute(select(func.count(Invoice.id)))).scalar_one()
    return count + 1


async def get_invoice(db: AsyncSession, invoice_id: str) -> Invoice | None:
    return await db.get(Invoice, invoice_id)


async def get_invoice_for_sale(db: AsyncSession, sale_id: str) -> Invoice | None:
    stmt = select(Invoice).where(Invoice.sale_id == sale_id)
    return (await db.execute(stmt)).scalars().first()


async def list_invoices(
    db: AsyncSession,
    *,
    merchant_id: str,
    period_start: datetime | None = None,
    period_end: datetime | None = None,
) -> list[Invoice]:
    stmt = select(Invoice).where(Invoice.merchant_id == merchant_id)
    if period_start is not None:
        stmt = stmt.where(Invoice.invoice_date >= period_start)
    if period_end is not None:
        stmt = stmt.where(Invoice.invoice_date < period_end)
    stmt = stmt.order_by(Invoice.invoice_date)
    return list((await db.execute(stmt)).scalars().all())
