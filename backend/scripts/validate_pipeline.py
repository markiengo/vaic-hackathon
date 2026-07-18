"""End-to-end pipeline validation (Sprint 3).

Runs the full deterministic pipeline against the seeded M001/2026-07
dataset — canonical ledger (already seeded) -> reconciliation ->
exceptions -> tax classification -> tax readiness -> draft export -> case
creation — and checks the result against a truth set documenting the
expected outcome for every one of the 23 bank_transactions.

This calls `app.services.reconciliation.reconcile_period` (P1's DB
integration layer) directly rather than going through the LangGraph agent
workflow: the agent path needs a live DeepSeek/OpenRouter API key and its
`reconciliation_node` does not yet call the real matching path (see
log.md's Sprint 3 entry) — this script exercises the actual deterministic
engine everything else is supposed to sit on top of, without an LLM
dependency, so it can run in CI or any dev machine with just Postgres.

Usage:
    python scripts/validate_pipeline.py            # reseed + validate
    python scripts/validate_pipeline.py --no-reset # validate existing data
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.payment import PaymentAllocation
from app.models.transaction import BankTransaction
from app.services.reconciliation import reconcile_period
from app.tools import (
    check_required_fields,
    classify_revenue_category,
    create_case,
    create_draft_export,
    export_to_accounting_system,
    generate_tax_readiness_report,
)
from scripts.seed_data import seed as seed_demo_data

MERCHANT_ID = "M001"
PERIOD = "2026-07"
CASE_ID = f"CASE-{MERCHANT_ID}-{PERIOD}"


@dataclass(frozen=True)
class ExpectedOutcome:
    kind: str  # "MATCHED" | "EXCEPTION"
    detail: str  # sale_id if MATCHED, exception_type if EXCEPTION
    note: str


# The real, observed truth set for the 23 seeded bank_transactions, run
# against app.services.reconciliation.reconcile_period with the current
# app.services.matching scoring weights. Three of these (the "fuzzy match"
# group) do NOT auto-match — they correctly land as MATCH_REVIEW exceptions
# a human resolves in the Exception Inbox, not silent NO_MATCH. See
# log.md's Sprint 3 entry for the full reasoning and the auto-reconciliation
# rate gap this leaves for P1's Sprint 3 tuning task.
TRUTH_SET: dict[str, ExpectedOutcome] = {
    # Exact match via payment reference (PAY-A8F21X embedded in the note —
    # the literal docs/05-domain/02-algorithm.md fixture).
    "SEPAY-902194810": ExpectedOutcome("MATCHED", "ORDER-1842", "exact match, ref in note"),
    # Exact match via SePay `code` field (14 more payment-intent references).
    "SEPAY-902194901": ExpectedOutcome("MATCHED", "ORDER-1843", "exact match, ref in code"),
    "SEPAY-902194902": ExpectedOutcome("MATCHED", "ORDER-1844", "exact match, ref in code"),
    "SEPAY-902194903": ExpectedOutcome("MATCHED", "ORDER-1845", "exact match, ref in code"),
    "SEPAY-902194904": ExpectedOutcome("MATCHED", "ORDER-1846", "exact match, ref in code"),
    "SEPAY-902194905": ExpectedOutcome("MATCHED", "ORDER-1847", "exact match, ref in code"),
    "SEPAY-902194906": ExpectedOutcome("MATCHED", "ORDER-1848", "exact match, ref in code"),
    "SEPAY-902194907": ExpectedOutcome("MATCHED", "ORDER-1849", "exact match, ref in code"),
    "SEPAY-902194908": ExpectedOutcome("MATCHED", "ORDER-1850", "exact match, ref in code (later refunded)"),
    "SEPAY-902194909": ExpectedOutcome("MATCHED", "ORDER-1851", "exact match, ref in code"),
    "SEPAY-902194910": ExpectedOutcome("MATCHED", "ORDER-1852", "exact match, ref in code"),
    "SEPAY-902194911": ExpectedOutcome("MATCHED", "ORDER-1853", "exact match, ref in code"),
    "SEPAY-902194912": ExpectedOutcome("MATCHED", "ORDER-1854", "exact match, ref in code"),
    "SEPAY-902194913": ExpectedOutcome("MATCHED", "ORDER-1855", "exact match, ref in code"),
    "SEPAY-902194914": ExpectedOutcome("MATCHED", "ORDER-1856", "exact match, ref in code"),
    # Refund against ORDER-1850's original payment.
    "SEPAY-902194950": ExpectedOutcome("MATCHED", "ORDER-1850", "refund, allocation_type=REFUND"),
    # Fuzzy candidates: exact amount, known sender, <1min -> HUMAN_CONFIRM.
    "SEPAY-902194960": ExpectedOutcome("EXCEPTION", "MATCH_REVIEW", "fuzzy candidate, score 80"),
    "SEPAY-902194961": ExpectedOutcome("EXCEPTION", "MATCH_REVIEW", "fuzzy candidate, score 80"),
    "SEPAY-902194962": ExpectedOutcome("EXCEPTION", "MATCH_REVIEW", "fuzzy candidate, score 80"),
    # Ambiguous same-amount pair (85,000, no identifier).
    "SEPAY-902194820": ExpectedOutcome("EXCEPTION", "AMBIGUOUS_MATCH", "duplicate amount, no identifier"),
    "SEPAY-902194821": ExpectedOutcome("EXCEPTION", "AMBIGUOUS_MATCH", "duplicate amount, no identifier"),
    # Non-revenue: no matching sale at all.
    "SEPAY-902194815": ExpectedOutcome("EXCEPTION", "NO_MATCH", "ck cho em -> internal_transfer"),
    "SEPAY-902194970": ExpectedOutcome("EXCEPTION", "NO_MATCH", "nhap hang 20/10 -> purchase_payment"),
}

NON_REVENUE_CLASSIFICATION_CHECKS = [
    ("SEPAY-902194815", "internal_transfer"),
    ("SEPAY-902194970", "purchase_payment"),
]

EXPECTED_MISSING_INVOICE_SALES = {"ORDER-1868", "ORDER-1869"}


class ValidationFailure(RuntimeError):
    pass


def _report(label: str, ok: bool, detail: str = "") -> bool:
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {label}" + (f" — {detail}" if detail else ""))
    return ok


async def run_reconciliation(db) -> None:
    case = await db.get(ReconciliationCase, CASE_ID)
    if case is None:
        db.add(ReconciliationCase(id=CASE_ID, merchant_id=MERCHANT_ID, period=PERIOD, status="OPEN"))
        await db.flush()

    known_senders_result = await db.execute(
        select(BankTransaction.sender_name).where(
            BankTransaction.merchant_id == MERCHANT_ID, BankTransaction.sender_name.isnot(None)
        ).distinct()
    )
    known_senders = [row[0] for row in known_senders_result.all()]

    summary = await reconcile_period(
        db, case_id=CASE_ID, merchant_id=MERCHANT_ID, period=PERIOD, known_sender_names=known_senders
    )
    await db.commit()
    print(
        f"reconcile_period: transactions_scanned={summary.transactions_scanned} "
        f"matched={summary.matched} exceptions={summary.exceptions} "
        f"(ambiguous={summary.ambiguous}, no_match={summary.no_match}, "
        f"review_required={summary.review_required}, "
        f"cash_discrepancies={summary.cash_discrepancies})"
    )


async def validate_truth_set(db) -> bool:
    print("\nTruth set validation (23 bank_transactions):")
    all_ok = True
    for tx_id, expected in TRUTH_SET.items():
        allocation = await db.scalar(
            select(PaymentAllocation).where(PaymentAllocation.bank_transaction_id == tx_id)
        )
        exception = await db.scalar(
            select(ExceptionRecord).where(ExceptionRecord.bank_transaction_id == tx_id)
        )
        if expected.kind == "MATCHED":
            ok = allocation is not None and allocation.sale_id == expected.detail
            actual = f"sale={allocation.sale_id}" if allocation else "no allocation"
        else:
            ok = exception is not None and exception.exception_type == expected.detail
            actual = f"type={exception.exception_type}" if exception else "no exception"
        all_ok &= _report(f"{tx_id} ({expected.note})", ok, actual)
    return all_ok


async def validate_tax_classification(db) -> bool:
    print("\nTax classification (non-revenue transactions):")
    all_ok = True
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
        ok = result["classification"] == expected_classification
        all_ok &= _report(
            f"classify_revenue_category({tx_id})",
            ok,
            f"expected={expected_classification} actual={result['classification']} "
            f"confidence={result['confidence']}",
        )
    return all_ok


async def validate_invoice_detection() -> bool:
    print("\nInvoice adapter integration:")
    result = await check_required_fields(MERCHANT_ID, PERIOD)
    missing = set(result["missing_invoice_sales"])
    return _report(
        "check_required_fields missing_invoice_sales",
        missing == EXPECTED_MISSING_INVOICE_SALES,
        f"expected={sorted(EXPECTED_MISSING_INVOICE_SALES)} actual={sorted(missing)}",
    )


async def validate_tax_readiness() -> bool:
    print("\nTax readiness report:")
    report = await generate_tax_readiness_report(MERCHANT_ID, PERIOD, "2026.07")
    items = {item["item"]: item for item in report.checklist}
    ok = _report("rule_version_valid", items["rule_version_valid"]["pass"] is True)
    ok &= _report(
        "missing_invoices == 2",
        items["missing_invoices"]["value"] == 2,
        str(items["missing_invoices"]),
    )
    ok &= _report(
        "ready == False (unresolved exceptions remain)",
        report.ready is False,
    )
    for item in report.checklist:
        print(f"    - {item['item']}: value={item['value']} pass={item['pass']}")
    return ok


async def validate_draft_export() -> bool:
    print("\nDraft export (should be gated — exceptions unresolved):")
    result = await create_draft_export(MERCHANT_ID, PERIOD, "2026.07", "json")
    gated = _report(
        "create_draft_export refuses with ERR-TAX-002 while not ready",
        result.error is not None and "ERR-TAX-002" in result.error,
        result.error,
    )
    accounting = await export_to_accounting_system(MERCHANT_ID, PERIOD, "csv")
    ungated = _report(
        "export_to_accounting_system succeeds (not readiness-gated)",
        accounting.error is None and "MaChungTu" in str(accounting.output),
    )
    return gated and ungated


async def validate_case_creation() -> bool:
    print("\nMerchant Ops case creation:")
    async with AsyncSessionLocal() as db:
        exception_ids_result = await db.execute(
            select(ExceptionRecord.id).where(ExceptionRecord.case_id == CASE_ID)
        )
        exception_ids = [str(row[0]) for row in exception_ids_result.all()]

    case = await create_case(MERCHANT_ID, PERIOD, exception_ids=exception_ids)
    return _report(
        "create_case links all exceptions from this period",
        case["exception_count"] == len(exception_ids) and case["exception_count"] > 0,
        f"case={case['id']} exception_count={case['exception_count']}",
    )


async def main(reset: bool) -> int:
    print(f"=== TaxLens pipeline validation: {MERCHANT_ID} / {PERIOD} ===\n")

    if reset:
        print("Seeding demo dataset (--reset)...")
        await seed_demo_data(reset=True)
        print()

    async with AsyncSessionLocal() as db:
        await run_reconciliation(db)

    results: list[bool] = []
    async with AsyncSessionLocal() as db:
        results.append(await validate_truth_set(db))
        results.append(await validate_tax_classification(db))

    results.append(await validate_invoice_detection())
    results.append(await validate_tax_readiness())
    results.append(await validate_draft_export())
    results.append(await validate_case_creation())

    await engine.dispose()

    print("\n" + "=" * 60)
    if all(results):
        print("ALL PIPELINE VALIDATIONS PASSED")
        return 0
    print("SOME PIPELINE VALIDATIONS FAILED — see [FAIL] lines above")
    return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate the TaxLens pipeline end-to-end.")
    parser.add_argument("--no-reset", dest="reset", action="store_false", help="skip reseeding")
    parser.set_defaults(reset=True)
    args = parser.parse_args()
    sys.exit(asyncio.run(main(reset=args.reset)))
