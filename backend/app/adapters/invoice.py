"""Invoice mock adapter — fetch invoices from mock API and map to invoices table."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.invoice import Invoice

logger = logging.getLogger(__name__)


async def fetch_invoices(
    merchant_id: str,
    period: str,
) -> list[dict]:
    """Fetch invoices from the mock invoice API.

    Args:
        merchant_id: TaxLens merchant ID.
        period: Period string like '2026-07'.

    Returns:
        List of raw invoice dicts from the API.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            settings.INVOICE_API_URL,
            params={"merchant_id": merchant_id, "period": period},
        )
        resp.raise_for_status()
        data = resp.json()

    invoices = data.get("invoices", data) if isinstance(data, dict) else data
    if not isinstance(invoices, list):
        invoices = []

    logger.info(
        "Invoice fetch: merchant=%s period=%s count=%d",
        merchant_id, period, len(invoices),
    )
    return invoices


async def sync_invoices(
    session: AsyncSession,
    merchant_id: str,
    period: str,
) -> dict:
    """Fetch invoices from mock API and insert into invoices table (idempotent).

    Returns: {"synced": int, "skipped": int}
    """
    raw_invoices = await fetch_invoices(merchant_id, period)
    synced = 0
    skipped = 0

    for raw in raw_invoices:
        inv_id = raw.get("id") or raw.get("invoice_id")
        if not inv_id:
            logger.warning("Invoice missing id, skipping: %s", raw)
            skipped += 1
            continue

        existing = await session.execute(
            select(Invoice).where(Invoice.id == str(inv_id))
        )
        if existing.scalar_one_or_none() is not None:
            skipped += 1
            continue

        inv_date = None
        if raw.get("invoice_date"):
            try:
                inv_date = datetime.fromisoformat(raw["invoice_date"])
            except (ValueError, TypeError):
                inv_date = None

        inv = Invoice(
            id=str(inv_id),
            sale_id=raw.get("sale_id"),
            merchant_id=merchant_id,
            invoice_number=raw.get("invoice_number"),
            amount=Decimal(str(raw.get("amount", 0))),
            invoice_date=inv_date,
            status=raw.get("status", "PENDING"),
            source="mock_api",
            source_id=str(inv_id),
        )
        session.add(inv)
        synced += 1

    await session.commit()
    logger.info("Invoice sync: synced=%d skipped=%d", synced, skipped)
    return {"synced": synced, "skipped": skipped}