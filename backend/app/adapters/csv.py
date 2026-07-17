"""CSV/Excel import adapter — legacy bank statement import.

Template columns (see ``docs/03-engineering/05-integration.md`` § CSV/Excel
Import Adapter): ``date, amount, sender, note, type``. Rows are validated
independently; an invalid row is logged and skipped rather than failing the
whole import. Idempotency is by row-content hash, so re-uploading the same
file (or an overlapping export) never double-counts a transaction.
"""

from __future__ import annotations

import csv
import hashlib
import io
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.sepay import normalize_note
from app.models.transaction import BankTransaction

SOURCE = "csv"
REQUIRED_COLUMNS = {"date", "amount", "sender", "note", "type"}
_DATE_FORMATS = ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y")


@dataclass(frozen=True)
class CsvRowError:
    row_number: int
    reason: str
    raw_row: dict


@dataclass(frozen=True)
class ParsedCsvRow:
    row_number: int
    source_id: str
    merchant_id: str
    amount: Decimal
    sender_name: str | None
    raw_note: str | None
    normalized_note: str | None
    transaction_type: str | None
    transaction_date: datetime


@dataclass(frozen=True)
class CsvParseResult:
    rows: tuple[ParsedCsvRow, ...]
    errors: tuple[CsvRowError, ...]


def _row_hash(merchant_id: str, row: dict) -> str:
    digest_input = "|".join(
        [merchant_id, row.get("date", ""), row.get("amount", ""), row.get("sender", ""), row.get("note", "")]
    )
    return hashlib.sha256(digest_input.encode("utf-8")).hexdigest()[:16]


def _parse_date(value: str) -> datetime:
    for fmt in _DATE_FORMATS:
        try:
            parsed = datetime.strptime(value.strip(), fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError(f"unrecognized date format: {value!r}")


def parse_csv(content: str, *, merchant_id: str) -> CsvParseResult:
    """Parse CSV text into canonical rows for ``merchant_id``.

    Rows missing required data are collected as errors rather than raising,
    so one bad row does not abort an entire statement import.
    """

    reader = csv.DictReader(io.StringIO(content))
    header = {(name or "").strip().casefold() for name in (reader.fieldnames or [])}
    missing = REQUIRED_COLUMNS - header
    if missing:
        raise ValueError(f"CSV missing required columns: {sorted(missing)}")

    rows: list[ParsedCsvRow] = []
    errors: list[CsvRowError] = []

    for row_number, raw_row in enumerate(reader, start=2):
        normalized_row = {(key or "").strip().casefold(): (value or "").strip() for key, value in raw_row.items()}
        try:
            amount = Decimal(normalized_row["amount"])
            if amount == 0:
                raise ValueError("zero amount")
            transaction_date = _parse_date(normalized_row["date"])
        except (InvalidOperation, ValueError, KeyError) as exc:
            errors.append(CsvRowError(row_number=row_number, reason=str(exc), raw_row=raw_row))
            continue

        sender = normalized_row.get("sender") or None
        note = normalized_row.get("note") or None
        rows.append(
            ParsedCsvRow(
                row_number=row_number,
                source_id=f"CSVROW-{_row_hash(merchant_id, normalized_row)}",
                merchant_id=merchant_id,
                amount=amount,
                sender_name=unicodedata.normalize("NFC", sender) if sender else None,
                raw_note=note,
                normalized_note=normalize_note(note),
                transaction_type=normalized_row.get("type") or None,
                transaction_date=transaction_date,
            )
        )

    return CsvParseResult(rows=tuple(rows), errors=tuple(errors))


async def _find_existing(db: AsyncSession, source_id: str) -> BankTransaction | None:
    stmt = select(BankTransaction).where(BankTransaction.source_id == source_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def ingest_csv(db: AsyncSession, content: str, *, merchant_id: str) -> tuple[list[BankTransaction], CsvParseResult]:
    """Parse and idempotently ingest a CSV statement for ``merchant_id``.

    Returns the newly-inserted (or already-existing) canonical rows plus the
    full parse result, so the caller can report skipped/invalid rows.
    """

    parsed = parse_csv(content, merchant_id=merchant_id)
    inserted: list[BankTransaction] = []

    for row in parsed.rows:
        existing = await _find_existing(db, row.source_id)
        if existing is not None:
            inserted.append(existing)
            continue
        record = BankTransaction(
            id=f"CSV-{row.source_id.split('-', 1)[-1]}",
            merchant_id=row.merchant_id,
            amount=row.amount,
            sender_name=row.sender_name,
            raw_note=row.raw_note,
            normalized_note=row.normalized_note,
            transaction_type=row.transaction_type,
            source=SOURCE,
            source_id=row.source_id,
            transaction_date=row.transaction_date,
        )
        db.add(record)
        await db.flush()
        inserted.append(record)

    return inserted, parsed
