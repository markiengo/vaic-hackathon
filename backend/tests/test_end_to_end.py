"""End-to-end pipeline test (Sprint 3): seed -> reconcile -> exceptions ->
tax classification -> tax readiness -> draft export -> case creation.

Reuses the truth set from scripts/validate_pipeline.py rather than
duplicating it. Reseeds and runs app.services.reconciliation.reconcile_period
itself (module-scoped, autouse) rather than relying on conftest.py's
already-seeded-but-not-yet-reconciled DB, since this test's whole point is
to validate the reconciled state.

Test-order note: this file is named to sort alphabetically before
test_tools.py, so it runs first against the shared seeded DB and
legitimately owns creating CASE-M001-2026-07 first in the session —
test_tools.py's own case test is written to be order-independent of this.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.payment import PaymentAllocation
from app.models.reconciliation import ExceptionRecord
from app.models.transaction import BankTransaction
from app.tools import (
    check_required_fields,
    classify_revenue_category,
    create_case,
    create_draft_export,
    export_to_accounting_system,
    generate_tax_readiness_report,
)
from scripts.validate_pipeline import (
    CASE_ID,
    EXPECTED_MISSING_INVOICE_SALES,
    MERCHANT_ID,
    NON_REVENUE_CLASSIFICATION_CHECKS,
    PERIOD,
    TRUTH_SET,
    run_reconciliation,
)


@pytest.fixture(scope="module", autouse=True)
async def _reconciled_state():
    async with AsyncSessionLocal() as db:
        await run_reconciliation(db)
    yield


async def test_reconcile_period_matches_truth_set_for_every_transaction():
    async with AsyncSessionLocal() as db:
        for tx_id, expected in TRUTH_SET.items():
            allocation = await db.scalar(
                select(PaymentAllocation).where(PaymentAllocation.bank_transaction_id == tx_id)
            )
            exception = await db.scalar(
                select(ExceptionRecord).where(ExceptionRecord.bank_transaction_id == tx_id)
            )
            if expected.kind == "MATCHED":
                assert allocation is not None, f"{tx_id}: expected a match ({expected.note}), got none"
                assert allocation.sale_id == expected.detail, f"{tx_id}: matched wrong sale"
            else:
                assert exception is not None, f"{tx_id}: expected exception {expected.detail} ({expected.note}), got none"
                assert exception.exception_type == expected.detail, (
                    f"{tx_id}: expected {expected.detail}, got {exception.exception_type}"
                )


async def test_reconcile_period_is_idempotent():
    """Re-running against already-reconciled data must not duplicate rows."""
    async with AsyncSessionLocal() as db:
        before_allocations = await db.scalar(select(PaymentAllocation.id))
        before_exceptions = len((await db.execute(select(ExceptionRecord.id))).all())

    async with AsyncSessionLocal() as db:
        await run_reconciliation(db)

    async with AsyncSessionLocal() as db:
        after_exceptions = len((await db.execute(select(ExceptionRecord.id))).all())
    assert after_exceptions == before_exceptions


async def test_non_revenue_transactions_classify_correctly():
    """This is the session's first classification of these two
    transactions (this file sorts alphabetically before test_tools.py),
    so the "ck cho em" fixture's confidence is pinned to the exact
    documented 0.82 here — test_tools.py's copy of this same fixture only
    asserts a lower bound, since it runs second and gets the prior-pattern
    bonus on top."""

    async with AsyncSessionLocal() as db:
        for tx_id, expected_classification in NON_REVENUE_CLASSIFICATION_CHECKS:
            tx = await db.get(BankTransaction, tx_id)
            result = await classify_revenue_category(
                {
                    "id": tx.id,
                    "merchant_id": tx.merchant_id,
                    "amount": str(tx.amount),
                    "sender_name": tx.sender_name,
                    "raw_note": tx.raw_note,
                }
            )
            assert result["classification"] == expected_classification, tx_id
            if tx_id == "SEPAY-902194815":
                assert result["confidence"] == 0.82


async def test_invoice_adapter_flags_exactly_two_missing_invoices():
    result = await check_required_fields(MERCHANT_ID, PERIOD)
    assert set(result["missing_invoice_sales"]) == EXPECTED_MISSING_INVOICE_SALES


async def test_tax_readiness_not_ready_and_draft_export_gated():
    report = await generate_tax_readiness_report(MERCHANT_ID, PERIOD, "2026.07")
    assert report.ready is False
    items = {item["item"]: item for item in report.checklist}
    assert items["missing_invoices"]["value"] == 2
    assert items["rule_version_valid"]["pass"] is True

    export = await create_draft_export(MERCHANT_ID, PERIOD, "2026.07", "json")
    assert export.error is not None and "ERR-TAX-002" in export.error


async def test_export_to_accounting_system_not_readiness_gated():
    result = await export_to_accounting_system(MERCHANT_ID, PERIOD, "csv")
    assert result.error is None
    assert "MaChungTu" in result.output


async def test_case_creation_links_all_period_exceptions():
    async with AsyncSessionLocal() as db:
        exception_ids = [
            str(row[0])
            for row in (
                await db.execute(select(ExceptionRecord.id).where(ExceptionRecord.case_id == CASE_ID))
            ).all()
        ]
    assert len(exception_ids) == 8  # 2 ambiguous + 2 no_match + 3 review + 1 cash

    case = await create_case(MERCHANT_ID, PERIOD, exception_ids=exception_ids)
    assert case["id"] == CASE_ID
    assert case["exception_count"] == len(exception_ids)
