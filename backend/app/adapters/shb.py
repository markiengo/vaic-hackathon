"""SHB (Saigon-Hanoi Bank) adapter stub.

SHB uses SePay as its transaction gateway, so this adapter delegates
to the SePay API client for fetching transactions.
"""

from __future__ import annotations

import logging

from app.adapters.sepay import fetch_transactions as _sepay_fetch

logger = logging.getLogger(__name__)


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