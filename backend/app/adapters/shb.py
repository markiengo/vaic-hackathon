"""SHB (Saigon-Hanoi Bank) adapter stub.

SHB uses SePay as its transaction gateway, so this adapter delegates
to the SePay API client for fetching transactions.
"""

from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal

from app.adapters.sepay import fetch_transactions as _sepay_fetch

logger = logging.getLogger(__name__)


def mock_transaction(
    *,
    sepay_id: int,
    account_number: str,
    transaction_date: datetime,
    amount_in: Decimal | str = "0",
    transaction_content: str,
    reference_number: str | None = None,
    code: str | None = None,
    sub_account: str | None = None,
    accumulated: Decimal | str = "0",
    amount_out: Decimal | str = "0",
) -> dict:
    """Build one realistic SHB/SePay `/transactions/list`-shaped transaction.

    Used by ``scripts/seed_data.py`` to generate demo bank_transactions with
    Vietnamese sender/note content (with and without diacritics), satisfying
    the work-split's "SHB mock adapter with realistic transactions"
    requirement — this adapter otherwise only wraps the live SePay API,
    which has no seed-time data of its own to return.
    """

    return {
        "id": str(sepay_id),
        "bank_brand_name": "SHB",
        "account_number": account_number,
        "transaction_date": transaction_date.strftime("%Y-%m-%d %H:%M:%S"),
        "amount_out": str(amount_out),
        "amount_in": str(amount_in),
        "accumulated": str(accumulated),
        "transaction_content": transaction_content,
        "reference_number": reference_number,
        "code": code,
        "sub_account": sub_account,
        "bank_account_id": "21",
    }


class SHBAdapter:
    """Stub adapter for SHB bank transactions via SePay gateway."""

    BANK_CODE = "SHB"

    async def fetch(
        self,
        merchant_id: str,
        period: str,
        account_number: str | None = None,
    ) -> list[dict]:
        """Fetch SHB transactions via SePay API.

        Args:
            merchant_id: TaxLens merchant ID.
            period: Period string like '2026-07'.
            account_number: SHB account number to filter by.

        Returns:
            List of raw transaction dicts from SePay.
        """
        logger.info(
            "SHBAdapter.fetch: merchant=%s period=%s account=%s",
            merchant_id, period, account_number,
        )
        return await _sepay_fetch(merchant_id, period, account_number)