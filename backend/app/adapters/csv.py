"""CSV import adapter — parse CSV files and create bank_transactions.

Expected columns: date, amount, sender, note, type
Deduplicates by row hash + import batch ID.
"""

from __future__ import annotations

import csv
import hashlib
import io
import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import BankTransaction

logger = logging.getLogger(__name__)


def _row_hash(row: dict, batch_id: str) -> str:
    raw = f"{batch_id}|{row.get('date','')}|{row.get('amount','')}|{row.get('sender','')}|{row.get('note','')}|{row.get('type','')}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _parse_date(date_str: str) -> datetime:
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%d/%m/%Y %H:%M:%S"):
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError(f"Unparseable date: {date_str}")


async def import_csv(
    session: AsyncSession,
    file_content: str,
    merchant_id: str,
    batch_id: str,
) -> dict:
    """Import CSV content into bank_transactions.

    Returns: {"imported": int, "skipped": int, "errors": list[str]}
    """
    reader = csv.DictReader(io.StringIO(file_content))
    imported = 0
    skipped = 0
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):
        try:
            if not row.get("date") or not row.get("amount"):
                raise ValueError("missing required fields: date, amount")

            amount = Decimal(str(row["amount"].strip()))
            tx_date = _parse_date(row["date"])
            row_h = _row_hash(row, batch_id)
            canonical_id = f"CSV-{batch_id}-{row_h}"

            existing = await session.execute(
                select(BankTransaction).where(BankTransaction.id == canonical_id)
            )
            if existing.scalar_one_or_none() is not None:
                skipped += 1
                continue

            tx = BankTransaction(
                id=canonical_id,
                merchant_id=merchant_id,
                amount=amount,
                sender_name=row.get("sender", "").strip() or None,
                raw_note=row.get("note", "").strip() or None,
                transaction_type=row.get("type", "").strip() or None,
                transaction_date=tx_date,
                source="csv",
                source_id=f"{batch_id}-{row_h}",
            )
            session.add(tx)
            imported += 1
        except (ValueError, InvalidOperation, KeyError) as exc:
            errors.append(f"Row {i}: {exc}")
            logger.warning("CSV import row %d failed: %s", i, exc)

    await session.commit()
    logger.info(
        "CSV import batch=%s: imported=%d skipped=%d errors=%d",
        batch_id, imported, skipped, len(errors),
    )
    return {"imported": imported, "skipped": skipped, "errors": errors}