"""Sprint 4 KPI + acceptance-criteria verification (P5).

Reads CURRENT database state and checks it against the 5 hackathon KPIs
(docs/01-foundation/03-product-spec.md §19) and the 12 MVP acceptance
criteria (§20). This script does not drive the pipeline itself — run
`scripts/run_demo.py` first (it exercises all 6 demo scenes end-to-end
and leaves the DB in the state this script inspects). Running against a
freshly-seeded, un-reconciled DB will legitimately report most KPIs/ACs
as FAIL — that is correct, not a bug in this script.

Where a check depends on a P1/P2/P4-owned code path that is currently a
known placeholder (see log.md Sprint 3/4 entries and scripts/run_demo.py's
module docstring), this script reports FAIL with an explicit "GAP (P#
scope)" label rather than silently skipping or softening the check.

Usage:
    python scripts/run_demo.py           # populate state first
    python scripts/verify_kpis.py
    python scripts/verify_kpis.py --run-id RUN-XXXXXXXX   # inspect a specific agent run
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from decimal import Decimal

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal, engine
from app.models.agent import AgentRun, AuditEvent, ToolCall
from app.models.cash import CashSession
from app.models.payment import PaymentAllocation, PaymentIntent
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.services.confirmation_tokens import decode_confirmation_token
from app.tools import check_required_fields, draft_merchant_message, generate_tax_readiness_report
from scripts.validate_pipeline import (
    CASE_ID,
    EXPECTED_MISSING_INVOICE_SALES,
    MERCHANT_ID,
    PERIOD,
    TRUTH_SET,
)

AUTO_RECON_TARGET = 0.80
EXCEPTION_REDUCTION_TARGET = 0.80
INITIAL_RESPONSE_TARGET_S = 5.0
FULL_CASE_TARGET_S = 30.0
WRITE_TOOL_NAMES = {
    "create_reconciliation_exception",
    "create_case",
    "assign_task_to_rm",
    "draft_merchant_message",
    "update_case_status",
    "send_confirmation_request",
    "create_draft_export",
    "export_to_accounting_system",
}


def _report(label: str, ok: bool, detail: str = "") -> bool:
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {label}" + (f" — {detail}" if detail else ""))
    return ok


async def _find_run(db, run_id: str | None) -> AgentRun | None:
    if run_id:
        return await db.get(AgentRun, run_id)
    result = await db.execute(
        select(AgentRun)
        .where(AgentRun.merchant_id == MERCHANT_ID)
        .order_by(AgentRun.started_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def kpi_1_2_reconciliation(db) -> tuple[bool, bool, int, int, int]:
    print("\nKPI 1: Auto-reconciliation rate >= 80%")
    total = await db.scalar(
        select(func.count(BankTransaction.id)).where(BankTransaction.merchant_id == MERCHANT_ID)
    )
    matched = await db.scalar(
        select(func.count(func.distinct(PaymentAllocation.bank_transaction_id)))
        .select_from(PaymentAllocation)
        .join(BankTransaction, PaymentAllocation.bank_transaction_id == BankTransaction.id)
        .where(BankTransaction.merchant_id == MERCHANT_ID)
    )
    total = total or 0
    matched = matched or 0
    rate = (matched / total) if total else 0.0
    ok1 = _report(f"{matched}/{total} auto-matched = {rate:.1%} (target >=80%)", rate >= AUTO_RECON_TARGET)

    print("\nKPI 2: Exception reduction >= 80%")
    exceptions = await db.scalar(
        select(func.count(ExceptionRecord.id)).where(ExceptionRecord.case_id == CASE_ID)
    )
    exceptions = exceptions or 0
    reduction = ((total - exceptions) / total) if total else 0.0
    ok2 = _report(
        f"{exceptions} exceptions / {total} transactions = {reduction:.1%} reduction (target >=80%)",
        reduction >= EXCEPTION_REDUCTION_TARGET,
    )
    return ok1, ok2, total, matched, exceptions


async def kpi_3_traceability(db, run: AgentRun | None) -> bool:
    print("\nKPI 3: Traceability — 100% decisions have tool call + confidence + audit record")
    if run is None:
        return _report(
            "no AgentRun found to inspect", False, "run scripts/run_demo.py first (see this script's docstring)"
        )

    calls_result = await db.execute(select(ToolCall).where(ToolCall.agent_run_id == run.id))
    calls = calls_result.scalars().all()
    ok = _report(f"run {run.id} has tool_calls recorded", len(calls) > 0, str(len(calls)))
    ok &= _report(
        "every tool_call has input_hash + output_hash",
        all(c.input_hash and c.output_hash for c in calls),
    )
    with_confidence = sum(1 for c in calls if c.confidence is not None)
    print(f"    ({with_confidence}/{len(calls)} tool_calls carry a confidence score — not every tool naturally produces one)")

    mirrored = await db.scalar(
        select(func.count(AuditEvent.id)).where(
            AuditEvent.merchant_id == MERCHANT_ID,
            AuditEvent.timestamp >= run.started_at,
            AuditEvent.action.in_(("tool_call", "tool_call_error")),
        )
    )
    ok &= _report(
        "audit_events mirrors tool_calls for this run's time window",
        (mirrored or 0) >= len(calls),
        f"audit_events={mirrored} tool_calls={len(calls)}",
    )

    human_decision_events = await db.scalar(
        select(func.count(AuditEvent.id)).where(
            AuditEvent.action.in_(("human_decision", "exception_resolved", "human_approval"))
        )
    )
    ok &= _report(
        "GAP (P4 scope): human approvals have an audit_events record "
        "(app/routers/reconciliation.py::resolve_exception writes no AuditEvent)",
        (human_decision_events or 0) > 0,
        f"matching audit_events={human_decision_events}",
    )
    return ok


async def kpi_4_action_completion(db, run: AgentRun | None) -> bool:
    print("\nKPI 4: Action completion — Planner finishes >=3 agents + >=2 write actions")
    if run is None:
        return _report("no AgentRun found to inspect", False, "run scripts/run_demo.py first")

    ok = _report("run status == COMPLETED", run.status == "COMPLETED", f"status={run.status}, error={run.error}")
    plan_agents = {step.get("agent") for step in (run.plan or []) if isinstance(step, dict)}
    ok &= _report(">=3 specialist agents in plan", len(plan_agents & {"reconciliation", "tax_compliance", "merchant_ops"}) == 3, str(plan_agents))

    write_count = await db.scalar(
        select(func.count(ToolCall.id)).where(
            ToolCall.agent_run_id == run.id, ToolCall.tool_name.in_(WRITE_TOOL_NAMES)
        )
    )
    ok &= _report(">=2 write-action tool calls", (write_count or 0) >= 2, str(write_count))
    return ok


async def kpi_5_latency(db, run: AgentRun | None) -> bool:
    print("\nKPI 5: Latency — initial response <5s, full case <30s")
    if run is None or run.completed_at is None:
        return _report("no completed AgentRun found to inspect", False, "run scripts/run_demo.py first")

    first_call = await db.scalar(
        select(func.min(ToolCall.called_at)).where(ToolCall.agent_run_id == run.id)
    )
    initial_s = (first_call - run.started_at).total_seconds() if first_call else None
    full_s = (run.completed_at - run.started_at).total_seconds()

    ok = True
    if initial_s is not None:
        ok &= _report(f"initial response <5s (actual {initial_s:.2f}s)", initial_s < INITIAL_RESPONSE_TARGET_S)
    else:
        ok &= _report("initial response measurable", False, "no tool_calls recorded")
    ok &= _report(f"full case <30s (actual {full_s:.2f}s)", full_s < FULL_CASE_TARGET_S)
    return ok


async def acceptance_criteria(db, run: AgentRun | None) -> bool:
    print("\nAcceptance criteria (§20 — 12 criteria)")
    ok = True

    ok &= _report("AC-01: NL request -> plan + executes", run is not None and run.status == "COMPLETED" and bool(run.plan))

    exact_match_id, exact_match = next(
        (tx_id, exp) for tx_id, exp in TRUTH_SET.items() if exp.kind == "MATCHED" and exp.note.startswith("exact match")
    )
    allocation = await db.scalar(select(PaymentAllocation).where(PaymentAllocation.bank_transaction_id == exact_match_id))
    ok &= _report(
        "AC-02: bank transaction auto-matches sale when reference present",
        allocation is not None and allocation.sale_id == exact_match.detail,
    )

    ambiguous_ex = await db.scalar(
        select(ExceptionRecord).where(ExceptionRecord.bank_transaction_id == "SEPAY-902194815")
    )
    ok &= _report(
        "AC-03: ambiguous transaction -> AI suggestion + human confirm",
        ambiguous_ex is not None and ambiguous_ex.status == "RESOLVED" and ambiguous_ex.human_decision is not None,
    )

    report = await generate_tax_readiness_report(MERCHANT_ID, PERIOD, "2026.07")
    ok &= _report("AC-04: tax-readiness report shows pass/fail checklist", len(report.checklist) > 0)
    # Scene 2 (if it has run) adds its own uninvoiced sale on top of the 2
    # documented seed fixtures, so check the fixtures are still flagged
    # rather than asserting an exact total count.
    fields_result = await check_required_fields(MERCHANT_ID, PERIOD)
    missing_sales = set(fields_result["missing_invoice_sales"])
    ok &= _report(
        "AC-05: missing invoices detected and flagged",
        EXPECTED_MISSING_INVOICE_SALES.issubset(missing_sales),
        f"missing={sorted(missing_sales)}",
    )

    case = await db.get(ReconciliationCase, CASE_ID)
    exception_count = await db.scalar(select(func.count(ExceptionRecord.id)).where(ExceptionRecord.case_id == CASE_ID))
    ok &= _report("AC-06: case auto-created for unresolved exceptions", case is not None and (exception_count or 0) > 0)

    pending_exceptions = await db.scalar(
        select(func.count(ExceptionRecord.id)).where(ExceptionRecord.case_id == CASE_ID, ExceptionRecord.status == "PENDING")
    )
    if pending_exceptions:
        draft = await draft_merchant_message(CASE_ID, MERCHANT_ID, PERIOD)
        vietnamese_ok = "SHB" in draft.message and ("đối soát" in draft.message.lower() or "xac nhan" in draft.message.lower() or "xác nhận" in draft.message.lower())
        ok &= _report("AC-07: draft message is Vietnamese, merchant-friendly", vietnamese_ok, draft.message[:80])
    else:
        ok &= _report("AC-07: draft message is Vietnamese, merchant-friendly", False, "no PENDING exceptions left to draft against")

    latest_intent = await db.scalar(select(PaymentIntent).order_by(PaymentIntent.expires_at.desc()).limit(1))
    ok &= _report("AC-08: Mini POS creates sale + dynamic QR", latest_intent is not None and bool(getattr(latest_intent, "id", None)))

    cash_session = await db.scalar(select(CashSession).limit(1))
    ok &= _report("AC-09: cash payment record + cash reconciliation", cash_session is not None and cash_session.discrepancy is not None)

    ok &= _report("AC-10: agent trace available (tool_calls persisted)", run is not None and await db.scalar(select(func.count(ToolCall.id)).where(ToolCall.agent_run_id == (run.id if run else "-"))) > 0 if run else False)

    audit_count = await db.scalar(select(func.count(AuditEvent.id)))
    ok &= _report("AC-11: audit log export JSON + CSV (data available)", (audit_count or 0) > 0, f"{audit_count} audit_events rows")

    if pending_exceptions:
        draft = await draft_merchant_message(CASE_ID, MERCHANT_ID, PERIOD)
        token = draft.message.rsplit("/confirm/", 1)[-1].strip() if "/confirm/" in draft.message else None
        token_ok = False
        if token:
            try:
                decode_confirmation_token(token)
                token_ok = True
            except Exception:
                token_ok = False
        ok &= _report("AC-12: merchant confirmation via signed link", token_ok, f"token_present={bool(token)}")
    else:
        ok &= _report("AC-12: merchant confirmation via signed link", False, "no PENDING exceptions left to mint a token for")

    return ok


async def main(run_id: str | None) -> int:
    print(f"=== TaxLens Sprint 4 KPI verification: {MERCHANT_ID} / {PERIOD} ===")

    async with AsyncSessionLocal() as db:
        run = await _find_run(db, run_id)
        if run is not None:
            print(f"\nInspecting agent run: {run.id} (status={run.status}, started_at={run.started_at})")

        ok1, ok2, total, matched, exceptions = await kpi_1_2_reconciliation(db)
        ok3 = await kpi_3_traceability(db, run)
        ok4 = await kpi_4_action_completion(db, run)
        ok5 = await kpi_5_latency(db, run)
        ok_ac = await acceptance_criteria(db, run)

    await engine.dispose()

    results = {
        "KPI 1 (auto-reconciliation >=80%)": ok1,
        "KPI 2 (exception reduction >=80%)": ok2,
        "KPI 3 (traceability)": ok3,
        "KPI 4 (action completion)": ok4,
        "KPI 5 (latency)": ok5,
        "Acceptance criteria (§20)": ok_ac,
    }
    print("\n" + "=" * 70)
    for name, ok in results.items():
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    if all(results.values()):
        print("ALL KPIs AND ACCEPTANCE CRITERIA PASSED")
        return 0
    print("SOME KPIs/ACCEPTANCE CRITERIA FAILED — see [FAIL]/GAP lines above for owning role.")
    return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify TaxLens Sprint 4 KPIs and acceptance criteria.")
    parser.add_argument("--run-id", default=None, help="inspect a specific agent_runs.id instead of the most recent")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(run_id=args.run_id)))
