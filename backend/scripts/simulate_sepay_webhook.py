"""Manually fire a SePay webhook event — the demo fallback path.

If the live SePay connection (real bank account + ngrok/tunnel — see
docs/03-engineering/06-sepay-integration.md) fails during the demo, this
posts the same shaped payload directly to the local webhook endpoint, so
the "money arrives -> auto-match -> toast" flow can still be shown without
depending on a live tunnel or an actual bank transfer landing in time.

Two modes:

  --reference PAY-XXXXXX   Look up that payment_intent's amount/sale in the
                            DB and build a realistic exact-match payload —
                            for replaying "Scene 2" (QR payment) live.
  --amount / --note / ...  Freeform payload for anything else (e.g. an
                            ambiguous/no-reference transfer for Scene 3).

Usage:
    python scripts/simulate_sepay_webhook.py --reference PAY-A8F21X
    python scripts/simulate_sepay_webhook.py --amount 5000000 --note "ck cho em" --sender "NGUYEN VAN A"
    python scripts/simulate_sepay_webhook.py --reference PAY-A8F21X --url https://staging.example.com/api/v1/webhooks/sepay
"""

from __future__ import annotations

import argparse
import asyncio
import random
import sys
from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.models.payment import PaymentIntent

DEFAULT_URL = "http://localhost:8000/api/v1/webhooks/sepay"
DEFAULT_ACCOUNT_NUMBER = "0778478888"


async def _lookup_reference(reference: str) -> PaymentIntent | None:
    async with AsyncSessionLocal() as db:
        intent = await db.get(PaymentIntent, reference.strip().upper())
        await engine.dispose()
        return intent


def _build_payload(
    *,
    amount,
    note: str,
    code: str | None,
    reference_code: str | None,
    account_number: str,
) -> dict:
    sepay_id = random.randint(10_000_000, 99_999_999)
    return {
        "id": sepay_id,
        "gateway": "SHB",
        "transactionDate": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "accountNumber": account_number,
        "code": code,
        "content": note,
        "transferType": "in",
        "transferAmount": str(amount),
        "accumulated": "0",
        "subAccount": None,
        "referenceCode": reference_code,
        "description": note,
    }


async def main(args: argparse.Namespace) -> int:
    if args.reference:
        intent = await _lookup_reference(args.reference)
        if intent is None:
            print(f"No payment_intent found for reference {args.reference!r}.", file=sys.stderr)
            return 1
        payload = _build_payload(
            amount=intent.amount,
            note=f"KHACH HANG chuyen khoan {intent.id}",
            code=intent.id,
            reference_code=None,
            account_number=args.account,
        )
        print(f"Simulating exact-match payment for {args.reference} (sale {intent.sale_id}, amount {intent.amount})")
    else:
        if args.amount is None:
            print("Provide --reference or --amount.", file=sys.stderr)
            return 1
        payload = _build_payload(
            amount=args.amount,
            note=f"{args.sender} {args.note}".strip() if args.sender else args.note,
            code=None,
            reference_code=None,
            account_number=args.account,
        )
        print(f"Simulating freeform transfer: amount={args.amount} note={payload['content']!r}")

    headers = {"Authorization": f"Apikey {settings.SEPAY_WEBHOOK_API_KEY}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(args.url, json=payload, headers=headers)

    print(f"POST {args.url} -> {response.status_code} {response.text}")
    return 0 if response.status_code in (200, 201) else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fire a SePay webhook event manually (demo fallback).")
    parser.add_argument("--reference", help="payment_intent id, e.g. PAY-A8F21X")
    parser.add_argument("--amount", type=str, help="transfer amount (freeform mode)")
    parser.add_argument("--note", default="chuyen khoan", help="transfer note (freeform mode)")
    parser.add_argument("--sender", default=None, help="sender name prefix (freeform mode)")
    parser.add_argument("--account", default=DEFAULT_ACCOUNT_NUMBER, help="receiving account number")
    parser.add_argument("--url", default=DEFAULT_URL, help="webhook endpoint to POST to")
    parsed = parser.parse_args()
    sys.exit(asyncio.run(main(parsed)))
