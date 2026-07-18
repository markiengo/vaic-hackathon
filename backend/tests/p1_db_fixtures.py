"""Dedicated in-memory DB fixtures for P1 reconciliation integration tests."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.cash import CashSession
from app.models.merchant import Merchant, Store
from app.models.payment import PaymentAllocation, PaymentIntent
from app.models.reconciliation import ReconciliationCase
from app.models.sale import Sale
from app.models.transaction import BankTransaction


ZERO = Decimal("0")


@compiles(JSONB, "sqlite")
def _compile_jsonb_for_sqlite(_type, _compiler, **_kwargs):
    return "JSON"


@dataclass(frozen=True)
class P1TruthSet:
    case_id: str
    merchant_id: str
    period: str
    store_id: str
    cash_session_id: int
    exact_matches: dict[str, str]
    ambiguous_transaction_ids: tuple[str, ...]
    no_match_transaction_ids: tuple[str, ...]


@pytest.fixture(name="_setup_db", autouse=True, scope="session")
async def disable_shared_seed_for_p1_tests():
    """Override main's external-DB autouse seed inside P1 test modules only."""

    yield


@pytest.fixture(name="p1_db_session")
async def p1_db_session_fixture() -> AsyncSession:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()
    await engine.dispose()


@pytest.fixture(name="p1_truth_set")
async def p1_truth_set_fixture(p1_db_session: AsyncSession) -> P1TruthSet:
    merchant_id = "P1-MERCHANT"
    store_id = "P1-STORE"
    case_id = "P1-CASE-202607"
    period = "2026-07"
    base = datetime(2026, 7, 10, 8, 0, tzinfo=timezone.utc)

    p1_db_session.add_all(
        [
            Merchant(id=merchant_id, name="P1 Truth Merchant", status="ACTIVE"),
            Store(
                id=store_id,
                merchant_id=merchant_id,
                name="P1 Truth Store",
            ),
            ReconciliationCase(
                id=case_id,
                merchant_id=merchant_id,
                period=period,
                status="OPEN",
                priority="MEDIUM",
                human_approvals=[],
            ),
        ]
    )
    await p1_db_session.flush()

    exact_matches: dict[str, str] = {}
    for index in range(1, 26):
        sale_id = f"P1-SALE-{index:03d}"
        intent_id = f"PAY-A{index:05d}"
        transaction_id = f"P1-TX-{index:03d}"
        amount = Decimal(100_000 + index * 10_000)
        sale_time = base + timedelta(minutes=index * 2)
        p1_db_session.add(
            Sale(
                id=sale_id,
                merchant_id=merchant_id,
                store_id=store_id,
                gross_amount=amount,
                discount=ZERO,
                net_amount=amount,
                payment_status="UNPAID",
                invoice_status="PENDING",
                created_at=sale_time,
                updated_at=sale_time,
            )
        )
        p1_db_session.add(
            PaymentIntent(
                id=intent_id,
                sale_id=sale_id,
                merchant_id=merchant_id,
                amount=amount,
                status="PENDING",
                # Expired by batch-run time but valid at the transfer time.
                expires_at=datetime(2026, 7, 10, 23, 59, tzinfo=timezone.utc),
                created_at=sale_time,
            )
        )
        p1_db_session.add(
            BankTransaction(
                id=transaction_id,
                merchant_id=merchant_id,
                amount=amount,
                sender_name=f"Exact Payer {index}",
                raw_note=f"Thanh toan {intent_id}",
                payment_code=intent_id,
                transaction_type="in",
                source="p1_fixture",
                source_id=f"exact-{index}",
                ingested_at=sale_time + timedelta(seconds=30),
                transaction_date=sale_time + timedelta(seconds=30),
            )
        )
        exact_matches[transaction_id] = sale_id

    ambiguous_time = datetime(2026, 7, 11, 10, 0, tzinfo=timezone.utc)
    for suffix in ("A", "B"):
        p1_db_session.add(
            Sale(
                id=f"P1-AMB-SALE-{suffix}",
                merchant_id=merchant_id,
                store_id=store_id,
                gross_amount=Decimal("700000"),
                discount=ZERO,
                net_amount=Decimal("700000"),
                payment_status="UNPAID",
                invoice_status="PENDING",
                created_at=ambiguous_time,
                updated_at=ambiguous_time,
            )
        )
    ambiguous_transaction_ids = ("P1-TX-AMB-1", "P1-TX-AMB-2")
    for index, transaction_id in enumerate(ambiguous_transaction_ids, start=1):
        p1_db_session.add(
            BankTransaction(
                id=transaction_id,
                merchant_id=merchant_id,
                amount=Decimal("700000"),
                sender_name=f"Unknown Ambiguous {index}",
                raw_note="thanh toan don hang",
                transaction_type="in",
                source="p1_fixture",
                source_id=f"ambiguous-{index}",
                ingested_at=ambiguous_time + timedelta(seconds=20 + index),
                transaction_date=ambiguous_time + timedelta(seconds=20 + index),
            )
        )

    no_match_transaction_ids = ("P1-TX-NONE-1", "P1-TX-NONE-2")
    for index, transaction_id in enumerate(no_match_transaction_ids, start=1):
        transaction_time = datetime(
            2026, 7, 12, 12, index, tzinfo=timezone.utc
        )
        p1_db_session.add(
            BankTransaction(
                id=transaction_id,
                merchant_id=merchant_id,
                amount=Decimal(8_000_000 + index * 1_000_000),
                sender_name=f"No Match {index}",
                raw_note="khong co ma tham chieu",
                transaction_type="in",
                source="p1_fixture",
                source_id=f"none-{index}",
                ingested_at=transaction_time,
                transaction_date=transaction_time,
            )
        )

    cash_session = CashSession(
        store_id=store_id,
        opening_cash=Decimal("2000000"),
        expected_cash=None,
        counted_cash=Decimal("5080000"),
        cash_expenses=ZERO,
        discrepancy=None,
        discrepancy_reason="Short drawer requires merchant review",
        status="CLOSED",
        opened_at=datetime(2026, 7, 13, 8, 0, tzinfo=timezone.utc),
        closed_at=datetime(2026, 7, 13, 18, 0, tzinfo=timezone.utc),
    )
    p1_db_session.add(cash_session)
    await p1_db_session.flush()

    for index in range(1, 9):
        sale_id = f"P1-CASH-{index:02d}"
        allocation_time = datetime(
            2026, 7, 13, 8 + index, 0, tzinfo=timezone.utc
        )
        p1_db_session.add(
            Sale(
                id=sale_id,
                merchant_id=merchant_id,
                store_id=store_id,
                gross_amount=Decimal("400000"),
                discount=ZERO,
                net_amount=Decimal("400000"),
                payment_status="PAID",
                invoice_status="PENDING",
                created_at=allocation_time,
                updated_at=allocation_time,
            )
        )
        p1_db_session.add(
            PaymentAllocation(
                bank_transaction_id=None,
                payment_intent_id=None,
                sale_id=sale_id,
                amount=Decimal("400000"),
                allocation_type="PAYMENT",
                match_method="MANUAL",
                confidence=None,
                created_at=allocation_time,
            )
        )

    await p1_db_session.flush()
    return P1TruthSet(
        case_id=case_id,
        merchant_id=merchant_id,
        period=period,
        store_id=store_id,
        cash_session_id=cash_session.id,
        exact_matches=exact_matches,
        ambiguous_transaction_ids=ambiguous_transaction_ids,
        no_match_transaction_ids=no_match_transaction_ids,
    )
