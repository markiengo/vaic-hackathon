"""SePay webhook handler + API client.

Receives bank transaction webhooks from SePay, maps them to canonical
bank_transactions rows, and provides an API client for fetching transactions.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.transaction import BankTransaction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


async def get_bank_transactions(
    session: AsyncSession,
    merchant_id: str,
    period: str,
) -> list[BankTransaction]:
    """Query bank transactions for a merchant in a given period.

    Args:
        session: Async DB session.
        merchant_id: TaxLens merchant ID (e.g. 'M001').
        period: Period string like '2026-07'.

    Returns:
        List of BankTransaction ORM rows.
    """
    from datetime import date

    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    if int(month) == 12:
        period_end = date(int(year) + 1, 1, 1)
    else:
        period_end = date(int(year), int(month) + 1, 1)

    result = await session.execute(
        select(BankTransaction)
        .where(
            BankTransaction.merchant_id == merchant_id,
            BankTransaction.transaction_date >= period_start,
            BankTransaction.transaction_date < period_end,
        )
        .order_by(BankTransaction.transaction_date)
    )
    return list(result.scalars().all())


class SepayWebhookPayload(BaseModel):
    id: int | str
    gateway: str | None = None
    transactionDate: str
    accountNumber: str | None = None
    code: str | None = None
    content: str | None = None
    transferType: str | None = None
    transferAmount: float | int | str
    accumulated: float | int | str | None = None
    subAccount: str | None = None
    referenceCode: str | None = None
    description: str | None = None


def _parse_amount(value) -> Decimal:
    return Decimal(str(value))


def _parse_transaction_date(date_str: str) -> datetime:
    """Parse SePay date format: 'yyyy-mm-dd HH:MM:SS' -> timezone-aware datetime."""
    dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
    return dt.replace(tzinfo=timezone.utc)


async def process_webhook(
    session: AsyncSession, payload: SepayWebhookPayload, merchant_id: str
) -> bool:
    """Process a SePay webhook payload. Returns True if a new row was inserted."""
    canonical_id = f"SEPAY-{payload.id}"

    existing = await session.execute(
        select(BankTransaction).where(BankTransaction.id == canonical_id)
    )
    if existing.scalar_one_or_none() is not None:
        logger.info("SePay webhook duplicate: %s already exists", canonical_id)
        return False

    tx = BankTransaction(
        id=canonical_id,
        merchant_id=merchant_id,
        account_number=payload.accountNumber,
        amount=_parse_amount(payload.transferAmount),
        raw_note=payload.content or payload.description,
        transaction_type=payload.transferType,
        transaction_date=_parse_transaction_date(payload.transactionDate),
        reference_number=payload.referenceCode,
        payment_code=payload.code,
        sub_account=payload.subAccount,
        accumulated=_parse_amount(payload.accumulated) if payload.accumulated is not None else None,
        source="sepay",
        source_id=str(payload.id),
    )
    session.add(tx)
    await session.commit()
    logger.info("SePay webhook inserted: %s", canonical_id)
    return True


@router.post("/sepay")
async def sepay_webhook(
    request: Request,
    authorization: str = Header(...),
) -> dict:
    expected = f"Apikey {settings.SEPAY_WEBHOOK_API_KEY}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")

    body = await request.json()
    payload = SepayWebhookPayload(**body)

    merchant_id = request.query_params.get("merchant_id", "M001")

    async with AsyncSessionLocal() as session:
        await process_webhook(session, payload, merchant_id)

    return {"success": True}


async def fetch_transactions(
    merchant_id: str,
    period: str,
    account_number: str | None = None,
) -> list[dict]:
    """Fetch transactions from SePay API.

    Args:
        merchant_id: TaxLens merchant ID (for logging/context).
        period: Period string like '2026-07' — converted to date range.
        account_number: Bank account number to filter by.

    Returns:
        List of raw SePay transaction dicts.
    """
    year, month = period.split("-")
    date_min = f"{year}-{month}-01"
    if month == "12":
        date_max = f"{int(year) + 1}-01-01"
    else:
        date_max = f"{year}-{int(month) + 1:02d}-01"

    params: dict = {
        "transaction_date_min": date_min,
        "transaction_date_max": date_max,
        "limit": 5000,
    }
    if account_number:
        params["account_number"] = account_number

    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(
            f"{settings.SEPAY_API_URL}/transactions/list",
            headers={
                "Authorization": f"Bearer {settings.SEPAY_API_TOKEN}",
                "Content-Type": "application/json",
            },
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    transactions = data.get("transactions", data) if isinstance(data, dict) else data
    if not isinstance(transactions, list):
        transactions = []

    logger.info(
        "SePay fetch_transactions: merchant=%s period=%s count=%d",
        merchant_id, period, len(transactions),
    )
    return transactions