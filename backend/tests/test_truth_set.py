"""Sprint 3 truth-set evaluation against P5's canonical demo seed.

The test imports P5's seed builders but runs them in P1's isolated SQLite
fixture.  This keeps the evaluation deterministic and database-independent
while detecting drift in transaction IDs, sale IDs, amounts, and timestamps.
"""

from __future__ import annotations

from collections import Counter
from decimal import Decimal
from time import perf_counter

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import PaymentAllocation
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.sale import Sale
from app.models.transaction import BankTransaction
from app.services.matching import DEFAULT_MATCHING_CONFIG
from app.services.reconciliation import reconcile_period
from scripts.seed_data import (
    MERCHANT_ID,
    seed_merchant_and_org,
    seed_sales_and_bank_transactions,
)
from tests.p1_db_fixtures import (
    disable_shared_seed_for_p1_tests as _p1_no_seed,
)
from tests.p1_db_fixtures import p1_db_session_fixture as _p1_session


_P1_FIXTURES = (_p1_no_seed, _p1_session)
CASE_ID = "CASE-P1-SPRINT3-TRUTH"
PERIOD = "2026-07"

# These names represent independently verified sender history.  A caller must
# never populate this input by copying the transaction currently being scored.
TRUSTED_SENDER_HISTORY = (
    "Tran Thi Bich",
    "Le Van Nam",
    "Pham Thi Hanh",
    "NGUYEN VAN A",
)

EXPECTED_EXACT_MATCHES = {
    "SEPAY-902194810": "ORDER-1842",
    "SEPAY-902194901": "ORDER-1843",
    "SEPAY-902194902": "ORDER-1844",
    "SEPAY-902194903": "ORDER-1845",
    "SEPAY-902194904": "ORDER-1846",
    "SEPAY-902194905": "ORDER-1847",
    "SEPAY-902194906": "ORDER-1848",
    "SEPAY-902194907": "ORDER-1849",
    "SEPAY-902194908": "ORDER-1850",
    "SEPAY-902194909": "ORDER-1851",
    "SEPAY-902194910": "ORDER-1852",
    "SEPAY-902194911": "ORDER-1853",
    "SEPAY-902194912": "ORDER-1854",
    "SEPAY-902194913": "ORDER-1855",
    "SEPAY-902194914": "ORDER-1856",
}

EXPECTED_FUZZY_MATCHES = {
    "SEPAY-902194960": "ORDER-1857",
    "SEPAY-902194961": "ORDER-1858",
    "SEPAY-902194962": "ORDER-1859",
}

EXPECTED_REFUND_MATCHES = {
    "SEPAY-902194950": "ORDER-1850",
}

EXPECTED_EXCEPTIONS = {
    "SEPAY-902194820": "AMBIGUOUS_MATCH",
    "SEPAY-902194821": "AMBIGUOUS_MATCH",
    "SEPAY-902194815": "NO_MATCH",
    "SEPAY-902194970": "NO_MATCH",
}

EXPECTED_PAID_SALES = {
    *(sale_id for sale_id in EXPECTED_EXACT_MATCHES.values() if sale_id != "ORDER-1850"),
    *EXPECTED_FUZZY_MATCHES.values(),
    *(f"ORDER-{number}" for number in range(1862, 1870)),
}
EXPECTED_REFUNDED_SALES = {"ORDER-1850"}
EXPECTED_UNPAID_SALES = {"ORDER-1860", "ORDER-1861", "ORDER-1870", "ORDER-1871"}


@pytest.fixture
async def p5_matching_seed(p1_db_session: AsyncSession) -> AsyncSession:
    """Load only the P5 records needed by the bank-matching truth set.

    P5's current cash seed has no cash allocation ledger rows and leaves a
    non-zero discrepancy without a reason.  Cash behavior remains covered by
    ``test_cash_reconciliation.py``; this fixture intentionally does not mask
    that separate handoff gap.
    """

    await seed_merchant_and_org(p1_db_session)
    await seed_sales_and_bank_transactions(p1_db_session)
    p1_db_session.add(
        ReconciliationCase(
            id=CASE_ID,
            merchant_id=MERCHANT_ID,
            period=PERIOD,
            status="OPEN",
            priority="MEDIUM",
            human_approvals=[],
        )
    )
    await p1_db_session.flush()
    return p1_db_session


async def _run_truth_set(session: AsyncSession):
    started = perf_counter()
    summary = await reconcile_period(
        session,
        case_id=CASE_ID,
        merchant_id=MERCHANT_ID,
        period=PERIOD,
        known_sender_names=TRUSTED_SENDER_HISTORY,
        matching_config=DEFAULT_MATCHING_CONFIG,
    )
    return summary, perf_counter() - started


async def test_truth_set_covers_every_seed_transaction_and_sale(
    p5_matching_seed: AsyncSession,
):
    transaction_ids = set(
        (await p5_matching_seed.scalars(select(BankTransaction.id))).all()
    )
    sale_ids = set((await p5_matching_seed.scalars(select(Sale.id))).all())

    expected_transaction_ids = (
        set(EXPECTED_EXACT_MATCHES)
        | set(EXPECTED_FUZZY_MATCHES)
        | set(EXPECTED_REFUND_MATCHES)
        | set(EXPECTED_EXCEPTIONS)
    )
    expected_sale_ids = (
        EXPECTED_PAID_SALES | EXPECTED_REFUNDED_SALES | EXPECTED_UNPAID_SALES
    )

    assert len(transaction_ids) == 23
    assert transaction_ids == expected_transaction_ids
    assert len(sale_ids) == 30
    assert sale_ids == expected_sale_ids


async def test_seed_truth_set_meets_accuracy_safety_refund_and_latency_gates(
    p5_matching_seed: AsyncSession,
):
    summary, elapsed_seconds = await _run_truth_set(p5_matching_seed)

    assert summary.transactions_scanned == 23
    assert summary.matched == 19
    assert summary.exceptions == 4
    assert summary.ambiguous == 2
    assert summary.no_match == 2
    assert summary.review_required == 0
    assert summary.cash_discrepancies == 0
    assert Decimal(summary.matched) / Decimal(summary.transactions_scanned) >= Decimal("0.80")
    assert elapsed_seconds < 5

    allocation_rows = tuple(
        (
            await p5_matching_seed.execute(
                select(
                    PaymentAllocation.bank_transaction_id,
                    PaymentAllocation.sale_id,
                    PaymentAllocation.amount,
                    PaymentAllocation.allocation_type,
                ).where(PaymentAllocation.bank_transaction_id.is_not(None))
            )
        ).all()
    )
    actual_allocations = {
        transaction_id: (sale_id, Decimal(amount), allocation_type)
        for transaction_id, sale_id, amount, allocation_type in allocation_rows
    }
    expected_matches = {
        **EXPECTED_EXACT_MATCHES,
        **EXPECTED_FUZZY_MATCHES,
        **EXPECTED_REFUND_MATCHES,
    }

    assert len(actual_allocations) == len(expected_matches) == 19
    assert {
        transaction_id: sale_id
        for transaction_id, (sale_id, _amount, _allocation_type) in actual_allocations.items()
    } == expected_matches
    assert actual_allocations["SEPAY-902194950"] == (
        "ORDER-1850",
        Decimal("-180000"),
        "REFUND",
    )
    assert all(
        amount > 0 and allocation_type == "PAYMENT"
        for transaction_id, (_sale_id, amount, allocation_type) in actual_allocations.items()
        if transaction_id != "SEPAY-902194950"
    )

    exception_rows = dict(
        (
            await p5_matching_seed.execute(
                select(
                    ExceptionRecord.bank_transaction_id,
                    ExceptionRecord.exception_type,
                ).where(ExceptionRecord.case_id == CASE_ID)
            )
        ).all()
    )
    assert exception_rows == EXPECTED_EXCEPTIONS
    assert not (set(EXPECTED_EXCEPTIONS) & set(actual_allocations))

    sale_statuses = dict(
        (await p5_matching_seed.execute(select(Sale.id, Sale.payment_status))).all()
    )
    assert {sale_id for sale_id, status in sale_statuses.items() if status == "PAID"} == EXPECTED_PAID_SALES
    assert {sale_id for sale_id, status in sale_statuses.items() if status == "REFUNDED"} == EXPECTED_REFUNDED_SALES
    assert {sale_id for sale_id, status in sale_statuses.items() if status == "UNPAID"} == EXPECTED_UNPAID_SALES
    assert Counter(sale_statuses.values()) == {"PAID": 25, "REFUNDED": 1, "UNPAID": 4}
    assert Decimal(25) / Decimal(30) >= Decimal("0.80")


async def test_seed_truth_set_reconciliation_is_idempotent(
    p5_matching_seed: AsyncSession,
):
    first, _first_elapsed = await _run_truth_set(p5_matching_seed)
    second, second_elapsed = await _run_truth_set(p5_matching_seed)

    allocation_count = await p5_matching_seed.scalar(
        select(func.count()).select_from(PaymentAllocation).where(
            PaymentAllocation.bank_transaction_id.is_not(None)
        )
    )
    exception_count = await p5_matching_seed.scalar(
        select(func.count()).select_from(ExceptionRecord).where(
            ExceptionRecord.case_id == CASE_ID
        )
    )

    assert first.matched == second.matched == 19
    assert first.exceptions == second.exceptions == 4
    assert allocation_count == 19
    assert exception_count == 4
    assert second_elapsed < 5
