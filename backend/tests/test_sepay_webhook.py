"""Integration tests for SePay webhook handler.

Tests against real Supabase DB. Requires seed data to be present
(conftest.py handles seeding automatically).
"""

from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.adapters.sepay import SepayWebhookPayload, get_bank_transactions, process_webhook
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.transaction import BankTransaction

API_KEY = f"Apikey {settings.SEPAY_WEBHOOK_API_KEY}"
WEBHOOK_URL = "/api/v1/webhooks/sepay"

TEST_PAYLOAD = {
    "id": 99999,
    "gateway": "SHB",
    "transactionDate": "2026-07-15 14:30:00",
    "accountNumber": "99998888777766",
    "code": "TESTCODE001",
    "content": "Chuyen khoan test Salon Hoa",
    "transferType": "in",
    "transferAmount": "150000",
    "accumulated": "5000000",
    "subAccount": "0123456",
    "referenceCode": "PAY-TEST001",
    "description": "Test transaction",
}

EXPECTED_TX_ID = "SEPAY-99999"


@pytest.fixture(autouse=True)
async def cleanup_test_tx():
    """Remove test transaction before and after each test."""
    async with AsyncSessionLocal() as session:
        await session.execute(
            select(BankTransaction).where(BankTransaction.id == EXPECTED_TX_ID)
        )
        from sqlalchemy import delete
        await session.execute(
            delete(BankTransaction).where(BankTransaction.id == EXPECTED_TX_ID)
        )
        await session.commit()
    yield
    async with AsyncSessionLocal() as session:
        from sqlalchemy import delete
        await session.execute(
            delete(BankTransaction).where(BankTransaction.id == EXPECTED_TX_ID)
        )
        await session.commit()


async def test_webhook_creates_bank_transaction():
    """POST to /api/v1/webhooks/sepay creates a bank_transactions row."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            WEBHOOK_URL,
            json=TEST_PAYLOAD,
            headers={"Authorization": API_KEY},
        )

    assert resp.status_code == 200
    assert resp.json() == {"success": True}

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(BankTransaction).where(BankTransaction.id == EXPECTED_TX_ID)
        )
        tx = result.scalar_one_or_none()
        assert tx is not None
        assert tx.amount == Decimal("150000")
        assert tx.source == "sepay"
        assert tx.source_id == "99999"
        assert tx.payment_code == "TESTCODE001"
        assert tx.reference_number == "PAY-TEST001"
        assert tx.raw_note == "Chuyen khoan test Salon Hoa"
        assert tx.transaction_type == "in"


async def test_webhook_idempotency():
    """Same POST twice does not create a duplicate."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp1 = await client.post(
            WEBHOOK_URL,
            json=TEST_PAYLOAD,
            headers={"Authorization": API_KEY},
        )
        resp2 = await client.post(
            WEBHOOK_URL,
            json=TEST_PAYLOAD,
            headers={"Authorization": API_KEY},
        )

    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json() == {"success": True}
    assert resp2.json() == {"success": True}

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(BankTransaction).where(BankTransaction.id == EXPECTED_TX_ID)
        )
        txs = result.scalars().all()
        assert len(txs) == 1


async def test_webhook_invalid_api_key():
    """POST with invalid API key returns 401 with the standard error envelope."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            WEBHOOK_URL,
            json=TEST_PAYLOAD,
            headers={"Authorization": "Apikey wrong_key"},
        )

    assert resp.status_code == 401
    assert resp.json() == {
        "error": {"code": "ERR-WEBHOOK-001", "message": "Invalid webhook API key."}
    }


async def test_webhook_missing_api_key_header():
    """Omitting the Authorization header entirely also returns a clean 401
    (not FastAPI's default 422 for a missing required header)."""
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(WEBHOOK_URL, json=TEST_PAYLOAD)

    assert resp.status_code == 401


async def test_webhook_extracts_sender_name_from_content():
    """content = "NGUYEN VAN A chuyen tien ..." splits into sender_name +
    note on the transfer-verb marker."""
    from app.main import app

    payload = dict(TEST_PAYLOAD, content="NGUYEN VAN A chuyen tien PAY-TEST001")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            WEBHOOK_URL, json=payload, headers={"Authorization": API_KEY}
        )
    assert resp.status_code == 200

    async with AsyncSessionLocal() as session:
        tx = await session.get(BankTransaction, EXPECTED_TX_ID)
        assert tx.sender_name == "Nguyen Van A"
        assert tx.normalized_note == "NGUYEN VAN A chuyen tien PAY-TEST001"


async def test_get_bank_transactions_returns_23():
    """get_bank_transactions('M001', '2026-07') returns 23 records from seed data."""
    async with AsyncSessionLocal() as session:
        txs = await get_bank_transactions(session, "M001", "2026-07")

    assert len(txs) == 23
    assert all(t.merchant_id == "M001" for t in txs)