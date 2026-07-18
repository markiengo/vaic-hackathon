"""
Integration tests for TaxLens HTTP API endpoints.

Uses in-memory SQLite (aiosqlite + StaticPool) + in-process FakeRedis.
Does NOT require Postgres or Redis — safe to run in CI without external services.

Coverage: 37 test cases
  Group A: 5  auth flow tests
  Group B: 24 error-code tests covering 22 unique codes
            (ERR-RECON-002 and ERR-GEN-001 each have 2 tests for 2 separate code paths)
  Group C: comment block only — 6 codes not tested here:
            ERR-MERCHANT-002, ERR-RUN-002, ERR-CASE-002, ERR-GEN-003,
            ERR-WEBHOOK-001 (test_sepay_webhook.py), ERR-WEBHOOK-002 (test_sepay_webhook.py)
  Group D: 6  happy-path flow tests
  Group E: 2  performance smoke tests (marked "slow", skipped with -k "not slow")

28/28 error code coverage: 22 tested here + 2 in test_sepay_webhook + 4 spec-reserved.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.cash import CashSession
from app.models.merchant import Merchant, Store
from app.models.product import Product
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.models.user import User


# ---------------------------------------------------------------------------
# SQLite compat: JSONB → JSON
# ---------------------------------------------------------------------------

@compiles(JSONB, "sqlite")
def _jsonb_for_sqlite(_type, _compiler, **_kw):
    return "JSON"


# ---------------------------------------------------------------------------
# Override conftest._setup_db to prevent real-Postgres seeding
# ---------------------------------------------------------------------------

@pytest.fixture(name="_setup_db", autouse=True, scope="session")
async def _noop_postgres_seed():
    """Shadows conftest._setup_db — this module uses in-memory SQLite, no real DB."""
    yield


# ---------------------------------------------------------------------------
# Minimal fake Redis (no fakeredis package needed)
# ---------------------------------------------------------------------------

class _FakeRedis:
    """In-process Redis stub tracking only the operations security.py calls."""

    def __init__(self) -> None:
        self._store: dict[str, object] = {}
        self._counters: dict[str, int] = {}

    async def exists(self, key: str) -> int:
        return 1 if key in self._store else 0

    async def incr(self, key: str) -> int:
        self._counters[key] = self._counters.get(key, 0) + 1
        return self._counters[key]

    async def expire(self, key: str, ttl: int) -> None:
        pass

    async def set(self, key: str, value: object, ex: int | None = None) -> None:
        self._store[key] = value

    async def delete(self, *keys: str) -> None:
        for k in keys:
            self._store.pop(k, None)
            self._counters.pop(k, None)

    async def get(self, key: str) -> object:
        return self._store.get(key)


# ---------------------------------------------------------------------------
# DB session fixture (function-scoped → fresh in-memory DB per test)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with factory() as session:
        yield session
        await session.rollback()

    await engine.dispose()


# ---------------------------------------------------------------------------
# api_client fixture: wires in-memory DB + FakeRedis into FastAPI app
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def api_client(db_session: AsyncSession):
    """Yields (client, admin_token, merchant_token, db_session)."""
    import app.core.security as _sec

    # --- Override get_db ---
    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_db

    # --- Patch get_redis (called directly, not via Depends) ---
    _fake_redis = _FakeRedis()

    async def _fake_get_redis():
        return _fake_redis

    _orig_get_redis = _sec.get_redis
    _sec.get_redis = _fake_get_redis

    # --- Seed minimal data ---
    merchant = Merchant(id="M-TEST-001", name="TaxLens Test Merchant", status="ACTIVE")
    store = Store(id="S-TEST-001", merchant_id="M-TEST-001", name="Test Store")
    admin_user = User(
        id="U-ADMIN-001",
        name="Admin User",
        email="admin@test.com",
        role="admin",
        merchant_id="M-TEST-001",
        password_hash=hash_password("TestPass123"),
        is_active=True,
    )
    merchant_user = User(
        id="U-MERCH-001",
        name="Merchant User",
        email="merchant@test.com",
        role="merchant",
        merchant_id="M-TEST-001",
        password_hash=hash_password("TestPass123"),
        is_active=True,
    )
    product = Product(
        id="PROD-T001",
        merchant_id="M-TEST-001",
        name="Test Product",
        category="beauty",
        price=Decimal("100000.00"),
        is_service=False,
        is_active=True,
    )
    # Bank transaction in period 2020-01 (used by reconciliation tests)
    bank_tx = BankTransaction(
        id="TX-T0001",
        merchant_id="M-TEST-001",
        amount=Decimal("500000.00"),
        sender_name="Test Sender",
        raw_note="Test payment",
        transaction_type="in",
        source="test",
        source_id="test-1",
        ingested_at=datetime(2020, 1, 15),
        transaction_date=datetime(2020, 1, 15),
    )
    db_session.add_all([merchant, store, admin_user, merchant_user, product, bank_tx])
    await db_session.commit()

    admin_token = create_access_token("U-ADMIN-001", "admin")
    merchant_token = create_access_token("U-MERCH-001", "merchant")

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client, admin_token, merchant_token, db_session
    finally:
        app.dependency_overrides.clear()
        _sec.get_redis = _orig_get_redis


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_expired_token(exception_id: int) -> str:
    """Build a valid-but-expired HMAC confirmation token."""
    expires_at = int(time.time()) - 100
    payload = f"{exception_id}:{expires_at}"
    sig = hmac.new(
        settings.JWT_SECRET.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()[:16]
    raw = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def _make_expired_jwt() -> str:
    """Build a syntactically-valid JWT that is already expired."""
    return jwt.encode(
        {
            "sub": "U-ADMIN-001",
            "role": "admin",
            "exp": datetime(2020, 1, 1, tzinfo=timezone.utc),
            "type": "access",
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


# ===========================================================================
# GROUP A — Auth flow (5 tests)
# ===========================================================================

async def test_login_valid_credentials(api_client):
    client, tok, _, db = api_client
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "TestPass123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password(api_client):
    client, _, __, ___ = api_client
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "WRONGPASS"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "ERR-AUTH-001"


async def test_me_with_valid_jwt(api_client):
    client, tok, _, db = api_client
    resp = await client.get("/api/v1/auth/me", headers=_auth(tok))
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "U-ADMIN-001"
    assert body["role"] == "admin"


async def test_me_without_jwt(api_client):
    client, _, __, ___ = api_client
    # No Authorization header → OAuth2 scheme returns 401
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_with_expired_jwt(api_client):
    client, _, __, ___ = api_client
    resp = await client.get("/api/v1/auth/me", headers=_auth(_make_expired_jwt()))
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "ERR-AUTH-002"


# ===========================================================================
# GROUP B — Error codes (24 tests covering 22 unique codes)
# ===========================================================================

# --- AUTH ---

async def test_err_auth_001_invalid_token(api_client):
    client, _, __, ___ = api_client
    resp = await client.get("/api/v1/auth/me", headers=_auth("garbage.token.here"))
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "ERR-AUTH-001"


async def test_err_auth_002_expired_token(api_client):
    client, _, __, ___ = api_client
    resp = await client.get("/api/v1/auth/me", headers=_auth(_make_expired_jwt()))
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "ERR-AUTH-002"


async def test_err_auth_003_insufficient_role(api_client):
    client, _, merchant_tok, ___ = api_client
    # Audit endpoint requires role admin/compliance/rm — merchant role is denied
    resp = await client.get("/api/v1/audit", headers=_auth(merchant_tok))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ERR-AUTH-003"


# --- MERCHANT ---

async def test_err_merchant_001_not_found(api_client):
    client, tok, _, __ = api_client
    resp = await client.get("/api/v1/merchants/NONEXISTENT-ID", headers=_auth(tok))
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ERR-MERCHANT-001"


# --- RECON (2 unique codes × 2 paths each = 4 tests) ---

async def test_err_recon_001_already_running(api_client):
    client, tok, _, __ = api_client
    payload = {"merchant_id": "M-TEST-001", "period": "2020-01"}
    first = await client.post("/api/v1/reconciliation/start", json=payload, headers=_auth(tok))
    assert first.status_code == 200  # created
    second = await client.post("/api/v1/reconciliation/start", json=payload, headers=_auth(tok))
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "ERR-RECON-001"


async def test_err_recon_002_no_transactions_via_reconciliation_start(api_client):
    client, tok, _, __ = api_client
    # period 2019-01 is past but has no bank transactions seeded
    resp = await client.post(
        "/api/v1/reconciliation/start",
        json={"merchant_id": "M-TEST-001", "period": "2019-01"},
        headers=_auth(tok),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "ERR-RECON-002"


async def test_err_recon_002_no_transactions_via_merchants_reconcile(api_client):
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/merchants/M-TEST-001/reconcile",
        json={"period": "2019-01"},
        headers=_auth(tok),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "ERR-RECON-002"


async def test_err_gen_001_period_not_ended_via_reconciliation_start(api_client):
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/reconciliation/start",
        json={"merchant_id": "M-TEST-001", "period": "2099-12"},
        headers=_auth(tok),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "ERR-GEN-001"


async def test_err_gen_001_period_not_ended_via_merchants_reconcile(api_client):
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/merchants/M-TEST-001/reconcile",
        json={"period": "2099-12"},
        headers=_auth(tok),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "ERR-GEN-001"


# --- RUN ---

async def test_err_run_001_case_not_found(api_client):
    client, tok, _, __ = api_client
    resp = await client.get("/api/v1/reconciliation/CASE-NONEXISTENT", headers=_auth(tok))
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ERR-RUN-001"


# --- EXCEPTION ---

async def test_err_exception_001_not_found(api_client):
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/reconciliation/exceptions/99999/resolve",
        json={"decision": "approved"},
        headers=_auth(tok),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ERR-EXCEPTION-001"


async def test_err_exception_002_already_resolved(api_client):
    client, tok, _, db = api_client
    # Seed a case and a RESOLVED exception
    case = ReconciliationCase(
        id="CASE-RESOLVED01",
        merchant_id="M-TEST-001",
        period="2020-01",
        status="OPEN",
        priority="MEDIUM",
        human_approvals=[],
    )
    ex = ExceptionRecord(
        case_id="CASE-RESOLVED01",
        exception_type="UNMATCHED",
        status="RESOLVED",
        human_decision="approved",
    )
    db.add(case)
    await db.flush()
    db.add(ex)
    await db.commit()

    resp = await client.post(
        f"/api/v1/reconciliation/exceptions/{ex.id}/resolve",
        json={"decision": "approved"},
        headers=_auth(tok),
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "ERR-EXCEPTION-002"


# --- TAX ---

async def test_err_tax_001_no_rule_version(api_client):
    client, tok, _, __ = api_client
    # No TaxRuleVersion seeded → check_required_fields returns rule_version=None
    resp = await client.get(
        "/api/v1/tax/readiness",
        params={"merchant_id": "M-TEST-001", "period": "2020-01"},
        headers=_auth(tok),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ERR-TAX-001"


async def test_err_tax_002_no_revenue_data(api_client):
    client, tok, _, __ = api_client
    # No PAID sales for M-TEST-001 → revenue_total=0 → ERR-TAX-002
    # No TaxRuleVersion seeded → rule_version="unknown" → ERR-TAX-003 block skipped
    resp = await client.post(
        "/api/v1/tax/export",
        json={"merchant_id": "M-TEST-001", "period": "2020-01", "format": "json"},
        headers=_auth(tok),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "ERR-TAX-002"


async def test_err_tax_003_rule_expired(api_client, monkeypatch):
    """ERR-TAX-003: export blocked when the matched rule version is expired.

    The standard retrieve_tax_rules() filters out expired rules, so we monkeypatch
    check_required_fields to return an expired rule version, then verify the
    export_draft handler raises ERR-TAX-003 when rv_row.effective_to < today.
    """
    from app.models.tax import TaxRuleVersion
    from app.services.tax_rules import FieldCheck, RequiredFieldsResult

    client, tok, _, db = api_client

    # Seed an expired rule version in the DB
    db.add(TaxRuleVersion(
        version="TEST-EXPIRED-v1",
        effective_from=date(2020, 1, 1),
        effective_to=date(2020, 12, 31),
        required_fields={"fields": []},
        formula_or_validation={},
        legal_source="Test expired rule",
        approval_status="APPROVED",
    ))
    await db.commit()

    # Monkeypatch check_required_fields so export_draft gets rule_version="TEST-EXPIRED-v1"
    async def _mock_check(session, merchant_id, period, **kw):
        return RequiredFieldsResult(
            merchant_id=merchant_id,
            period=period,
            rule_version="TEST-EXPIRED-v1",
            checks=(FieldCheck("revenue_total", Decimal("100"), ">0", True),),
            missing_invoice_sales=(),
            all_pass=True,
        )

    monkeypatch.setattr("app.routers.tax.check_required_fields", _mock_check)

    resp = await client.post(
        "/api/v1/tax/export",
        json={"merchant_id": "M-TEST-001", "period": "2020-01", "format": "json"},
        headers=_auth(tok),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "ERR-TAX-003"


# --- CASE ---

async def test_err_case_001_not_found(api_client):
    client, tok, _, __ = api_client
    resp = await client.get("/api/v1/cases/CASE-NONEXISTENT", headers=_auth(tok))
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ERR-CASE-001"


# --- POS ---

async def test_err_pos_001_price_mismatch(api_client):
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/pos/sales",
        json={
            "merchant_id": "M-TEST-001",
            "store_id": "S-TEST-001",
            "staff_id": "U-ADMIN-001",
            "items": [{
                "product_id": "PROD-T001",
                "product_name": "Test Product",
                "quantity": 1,
                "unit_price": "50000",  # catalog price is 100000 → mismatch
            }],
        },
        headers=_auth(tok),
    )
    assert resp.status_code in (400, 422)
    assert resp.json()["error"]["code"] == "ERR-POS-001"


async def test_err_pos_002_sale_already_paid(api_client):
    client, tok, _, db = api_client
    from app.models.sale import Sale
    paid_sale = Sale(
        id="SALE-PAID-001",
        merchant_id="M-TEST-001",
        store_id="S-TEST-001",
        gross_amount=Decimal("100000"),
        discount=Decimal("0"),
        net_amount=Decimal("100000"),
        payment_status="PAID",
        invoice_status="PENDING",
    )
    db.add(paid_sale)
    await db.commit()

    resp = await client.post(
        "/api/v1/pos/payment-intents",
        json={"sale_id": "SALE-PAID-001", "amount": "100000"},
        headers=_auth(tok),
    )
    assert resp.status_code in (400, 422)
    assert resp.json()["error"]["code"] == "ERR-POS-002"


async def test_err_pos_003_sale_not_found(api_client):
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/pos/payment-intents",
        json={"sale_id": "SALE-NONEXIST", "amount": "100000"},
        headers=_auth(tok),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ERR-POS-003"


async def test_err_pos_004_session_not_found(api_client):
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/pos/cash-sessions/99999/close",
        json={"counted_cash": "0"},
        headers=_auth(tok),
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ERR-POS-004"


async def test_err_pos_005_session_already_closed(api_client):
    client, tok, _, db = api_client
    closed_session = CashSession(
        store_id="S-TEST-001",
        opening_cash=Decimal("1000000"),
        expected_cash=Decimal("1000000"),
        counted_cash=Decimal("1000000"),
        cash_expenses=Decimal("0"),
        discrepancy=Decimal("0"),
        status="RECONCILED",
    )
    db.add(closed_session)
    await db.commit()

    resp = await client.post(
        f"/api/v1/pos/cash-sessions/{closed_session.id}/close",
        json={"counted_cash": "1000000"},
        headers=_auth(tok),
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "ERR-POS-005"


# --- TOKEN ---

async def test_err_token_001_invalid_token(api_client):
    client, _, __, ___ = api_client
    # "aW52YWxpZA" decodes to "invalid" which has no ":" → malformed → ERR-TOKEN-001
    resp = await client.get("/api/v1/confirm/aW52YWxpZA")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ERR-TOKEN-001"


async def test_err_token_002_expired_token(api_client):
    client, _, __, ___ = api_client
    expired_tok = _make_expired_token(exception_id=1)
    resp = await client.get(f"/api/v1/confirm/{expired_tok}")
    assert resp.status_code == 410
    assert resp.json()["error"]["code"] == "ERR-TOKEN-002"


# --- GEN ---

async def test_err_gen_002_info_leak_prevention(api_client):
    """ERR-GEN-002: unhandled exceptions return generic message, never raw exception detail.

    Starlette's ServerErrorMiddleware re-raises the exception AFTER sending the 500 response
    (so the server can log it). httpx's ASGITransport(raise_app_exceptions=False) lets us
    inspect the already-sent 500 response without the re-raise crashing the test.
    """
    _, tok, _, db = api_client

    orig_get = db.get

    async def _evil_get(model, pk, **kw):
        from app.models.merchant import Merchant as _Merchant
        if model is _Merchant:
            raise RuntimeError("secret internal detail")
        return await orig_get(model, pk, **kw)

    db.get = _evil_get
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://test",
        ) as err_client:
            resp = await err_client.get("/api/v1/merchants/M-TEST-001", headers=_auth(tok))
    finally:
        db.get = orig_get

    assert resp.status_code == 500
    data = resp.json()
    assert data["error"]["code"] == "ERR-GEN-002"
    # Info-leak prevention: the raw exception message must NOT appear in the response
    assert "secret internal detail" not in resp.text


# GROUP C — codes not tested in this file (comment only)
# ERR-MERCHANT-002 : no create/update-merchant endpoint
# ERR-RUN-002      : no endpoint to modify a completed run
# ERR-CASE-002     : no close-case endpoint
# ERR-GEN-003      : LLM unavailable — not mockable cleanly in unit scope
# ERR-WEBHOOK-001  : covered in tests/test_sepay_webhook.py
# ERR-WEBHOOK-002  : covered in tests/test_sepay_webhook.py


# ===========================================================================
# GROUP D — Happy-path flow tests (6 tests)
# ===========================================================================

async def test_flow_create_sale_pos(api_client):
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/pos/sales",
        json={
            "merchant_id": "M-TEST-001",
            "store_id": "S-TEST-001",
            "staff_id": "U-ADMIN-001",
            "items": [{
                "product_id": "PROD-T001",
                "product_name": "Test Product",
                "quantity": 2,
                "unit_price": "100000",
            }],
        },
        headers=_auth(tok),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "sale_id" in body
    assert body["sale_id"].startswith("ORDER-")
    assert body["payment_status"] == "UNPAID"


async def test_flow_create_payment_intent(api_client):
    client, tok, _, __ = api_client
    # First create a sale
    sale_resp = await client.post(
        "/api/v1/pos/sales",
        json={
            "merchant_id": "M-TEST-001",
            "store_id": "S-TEST-001",
            "staff_id": "U-ADMIN-001",
            "items": [{"product_id": "PROD-T001", "product_name": "Test Product", "quantity": 1, "unit_price": "100000"}],
        },
        headers=_auth(tok),
    )
    sale_id = sale_resp.json()["sale_id"]

    intent_resp = await client.post(
        "/api/v1/pos/payment-intents",
        json={"sale_id": sale_id, "amount": "100000"},
        headers=_auth(tok),
    )
    assert intent_resp.status_code == 201
    body = intent_resp.json()
    assert "payment_intent_id" in body
    assert "qr_data" in body
    assert body["status"] == "PENDING"


async def test_flow_get_transactions_wrapper(api_client):
    client, tok, _, __ = api_client
    resp = await client.get(
        "/api/v1/transactions",
        params={"merchant_id": "M-TEST-001", "period": "2020-01"},
        headers=_auth(tok),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "transactions" in body
    assert "total" in body
    assert body["total"] == len(body["transactions"])
    assert body["total"] >= 1  # TX-T0001 seeded in 2020-01


async def test_flow_transactions_status_filter(api_client):
    """Verify #12: ?status=unmatched filters to transactions with match_status=None."""
    client, tok, _, __ = api_client
    all_resp = await client.get(
        "/api/v1/transactions",
        params={"merchant_id": "M-TEST-001", "period": "2020-01"},
        headers=_auth(tok),
    )
    unmatched_resp = await client.get(
        "/api/v1/transactions",
        params={"merchant_id": "M-TEST-001", "period": "2020-01", "status": "unmatched"},
        headers=_auth(tok),
    )
    matched_resp = await client.get(
        "/api/v1/transactions",
        params={"merchant_id": "M-TEST-001", "period": "2020-01", "status": "matched"},
        headers=_auth(tok),
    )
    all_txs = all_resp.json()["transactions"]
    unmatched_txs = unmatched_resp.json()["transactions"]
    matched_txs = matched_resp.json()["transactions"]

    # All P1-placeholder transactions have match_status=None → all are "unmatched"
    assert len(unmatched_txs) == len(all_txs)
    assert matched_txs == []


async def test_flow_reconcile_returns_plan_placeholder(api_client):
    """Verify #14: POST reconcile response includes plan field with steps placeholder."""
    client, tok, _, __ = api_client
    resp = await client.post(
        "/api/v1/merchants/M-TEST-001/reconcile",
        json={"period": "2020-01"},
        headers=_auth(tok),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "run_id" in body
    assert body["status"] == "PLANNING"
    assert body.get("plan") is not None
    assert "steps" in body["plan"]


async def test_flow_dashboard_has_enriched_fields(api_client):
    """Verify #6: dashboard response includes merchant_id, period, tax_readiness, active_agents."""
    client, tok, _, __ = api_client
    resp = await client.get(
        "/api/v1/merchants/M-TEST-001/dashboard",
        params={"period": "2020-01"},
        headers=_auth(tok),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["merchant_id"] == "M-TEST-001"
    assert body["period"] == "2020-01"
    assert "tax_readiness" in body
    assert isinstance(body["tax_readiness"], dict)
    assert "active_agents" in body
    assert isinstance(body["active_agents"], list)


# ===========================================================================
# GROUP E — Performance smoke tests (slow, skip with -k "not slow")
# ===========================================================================

async def test_slow_dashboard_response_time(api_client):
    """Dashboard endpoint should respond within 5 s under in-memory SQLite load."""
    import time as _time

    client, tok, _, __ = api_client
    start = _time.monotonic()
    resp = await client.get(
        "/api/v1/merchants/M-TEST-001/dashboard",
        params={"period": "2020-01"},
        headers=_auth(tok),
    )
    elapsed_ms = (_time.monotonic() - start) * 1000

    assert resp.status_code == 200
    assert elapsed_ms < 5000, f"Dashboard took {elapsed_ms:.0f} ms (>5000 ms)"


async def test_slow_transactions_response_time(api_client):
    """Transactions list endpoint should respond within 5 s."""
    import time as _time

    client, tok, _, __ = api_client
    start = _time.monotonic()
    resp = await client.get(
        "/api/v1/transactions",
        params={"merchant_id": "M-TEST-001", "period": "2020-01"},
        headers=_auth(tok),
    )
    elapsed_ms = (_time.monotonic() - start) * 1000

    assert resp.status_code == 200
    assert elapsed_ms < 5000, f"Transactions took {elapsed_ms:.0f} ms (>5000 ms)"
