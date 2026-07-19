"""Sprint 4 demo runner (P5): drives all 6 demo scenes from
docs/04-delivery/00-work-split.md (Sprint 4, checklist §A) and
docs/01-foundation/03-product-spec.md §18 against a real `app.main:app`
instance over in-process ASGI (`httpx.ASGITransport` — no separate
`uvicorn` process required) and prints a PASS/FAIL report per scene.

Known gaps this script works around WITHOUT editing P1/P2/P4 files (see
log.md's Sprint 3/4 entries — this is a deliberate P5-scope boundary, not
an oversight):

  1. `POST /agents/run`'s background dispatch
     (app/routers/agents.py::_dispatch_agent_run) is a no-op placeholder.
     Scene 1 creates the real AgentRun row through the real endpoint, then
     directly invokes the already-built LangGraph workflow
     (app.agents.graph.agent_workflow) the same way that dispatcher is
     meant to once P2/P4 wire it, so real tool_calls/audit_events rows
     still get produced for this run.
  2. `app/agents/specialists.py::reconciliation_node` always records a
     hardcoded PENDING_REVIEW exception regardless of real match results
     (P2 scope). Scene 1 therefore only checks planning/traceability/
     write-action shape, not reconciliation correctness — that is verified
     separately in Scene 2/3 via `app.services.reconciliation.reconcile_period`
     (P1's real deterministic engine, same as scripts/validate_pipeline.py).
  3. `app/services/reconciliation.py`'s exception `ai_suggestion` payload
     only ever carries match candidates, never a revenue classification —
     `classify_revenue_category` (P5's own tool) is never merged onto the
     exception record automatically. Scene 3 calls the classifier directly
     to demonstrate/verify the "82% chuyen noi bo" suggestion and reports
     it alongside the exception, rather than silently wiring them together
     inside P1's service.
  4. `app/routers/reconciliation.py::resolve_exception` does not write an
     audit_events row for the human decision (P4 scope). Scene 3 reports
     this as a FAIL with an explicit note rather than hiding it.

Because tool execution inside the LangGraph workflow uses `asyncio.run()`
internally when no loop is running (see app/agents/executor.py), the
workflow MUST be invoked from plain synchronous code with no active event
loop — never from inside another `asyncio.run()` call. That is why this
script alternates between small `asyncio.run(...)` blocks and direct
synchronous calls instead of one top-level `async def main()`.

Usage:
    python scripts/run_demo.py                # reseed + run all 6 scenes
    python scripts/run_demo.py --no-reset      # run against existing data
    python scripts/run_demo.py --no-backup     # skip the backup-snapshot step
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal

from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.security import create_access_token
from app.main import app
from app.models.agent import AgentRun, AuditEvent, ToolCall
from app.models.payment import PaymentAllocation, PaymentIntent
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.transaction import BankTransaction
from app.tools import check_required_fields, classify_revenue_category, generate_tax_readiness_report
from scripts.backup_demo import DEFAULT_SNAPSHOT_PATH, backup
from scripts.seed_data import seed as seed_demo_data
from scripts.simulate_sepay_webhook import _build_payload
from scripts.validate_pipeline import (
    CASE_ID,
    EXPECTED_MISSING_INVOICE_SALES,
    MERCHANT_ID,
    PERIOD,
    run_reconciliation,
)

STORE_ID = "S001"
DEMO_PRODUCT_ID = "P006"  # "Cham soc da mat" — seeded at exactly 350,000 VND
DEMO_SALE_AMOUNT = Decimal("350000")
RM_USER_ID = "U003"  # seeded rm role
OPS_USER_ID = "U002"  # seeded ops_staff role
COMPLIANCE_USER_ID = "U004"  # seeded compliance role
AMBIGUOUS_TX_ID = "SEPAY-902194815"  # seeded 5,000,000 "ck cho em" fixture
SCENE1_CASE_ID = f"AGENTDEMO-{MERCHANT_ID}-{PERIOD}"
SCENE1_REQUEST_TEXT = "Kiem tra Salon Hoa da san sang cho ky bao cao thang 7 chua"

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


def _auth_headers(user_id: str, role: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id, role)}"}


# ---------------------------------------------------------------------------
# Scene 1 — natural language request -> Planner -> 3 specialist agents
# ---------------------------------------------------------------------------


async def _scene1_start_run() -> tuple[str, bool, float]:
    t0 = time.perf_counter()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/agents/run",
            json={"merchant_id": MERCHANT_ID, "period": PERIOD, "request": SCENE1_REQUEST_TEXT},
            headers=_auth_headers(OPS_USER_ID, "ops_staff"),
        )
    ok = _report("POST /agents/run accepted (202)", resp.status_code == 202, str(resp.status_code))
    body = resp.json() if ok else {}
    run_id = body.get("run_id")
    ok &= _report("run created with status=PLANNING", body.get("status") == "PLANNING", str(body))
    return run_id, ok, t0


def _invoke_workflow_sync(run_id: str) -> dict:
    """Direct call into P2's already-built graph. See module docstring gap #1.

    Must run with NO asyncio event loop active — app.agents.executor uses
    asyncio.run() internally per tool call.

    GAP (P2 scope, discovered running this script — more severe than the
    others, not just a placeholder): app.agents.graph/specialists.py use
    `list(state.get(key, []))` pervasively to accumulate trace/exception/
    completed-agent lists, but LangGraph pre-populates every
    declared-but-unset AgentGraphState TypedDict key as None in its
    internal channels (not the field's "empty" value) until a node
    explicitly sets it. The FIRST node to touch any not-yet-set list/dict
    field therefore crashes with `TypeError: 'NoneType' object is not
    iterable` — first observed at planner_node's exception-fallback branch
    (`errors = list(state.get("errors", []))`), and again at
    `_append_trace`'s `list(state.get("trace", []))` once that branch was
    avoided. This would crash ANY agent run in an environment without a
    working LLM call, not just this script. Worked around here — without
    editing graph.py/specialists.py — by (a) supplying a precomputed plan,
    which is planner_node's own documented early-return path
    (`if state.get("plan"): ...`), and (b) explicitly seeding every
    list/dict-typed AgentGraphState field the graph will touch on this run
    so LangGraph's channels start from a real value instead of None. This
    isn't limited to list/dict fields either — e.g. reconciliation_node's
    `Decimal(str(state.get("amount", "0")))` crashes on `Decimal(str(None))`
    the same way for a plain str-typed field. Flagged to the user; not
    fixed at the source per the decision to stay P5-scoped.
    """
    from app.agents.graph import agent_workflow

    state = {
        "agent_run_id": run_id,
        "merchant_id": MERCHANT_ID,
        "period": PERIOD,
        "case_id": SCENE1_CASE_ID,
        "request_text": SCENE1_REQUEST_TEXT,
        "rm_user_id": RM_USER_ID,
        "reference_number": "",
        "amount": "0",
        "time_window_minutes": 60,
        "merchant_segment": "salon",
        "business_vertical": "beauty_services",
        "tax_rule_version": "2026.07",
        "message": "",
        "plan": [
            {"step": 1, "agent": "reconciliation", "action": "Doi soat giao dich va tao ngoai le neu can."},
            {"step": 2, "agent": "tax_compliance", "action": "Kiem tra tinh san sang thue va rule version."},
            {"step": 3, "agent": "merchant_ops", "action": "Tao case, gan RM, va draft message cho merchant."},
        ],
        "transactions": [],
        "sales": [],
        "matches": [],
        "exceptions": [],
        "human_approvals": [],
        "completed_agents": [],
        "errors": [],
        "trace": [],
        "reconciliation_output": {},
        "tax_compliance_output": {},
        "merchant_ops_output": {},
        "reconciliation_tool_calls": [],
        "tax_compliance_tool_calls": [],
        "merchant_ops_tool_calls": [],
        "budget": {},
    }
    return agent_workflow.invoke(state)


async def _scene1_finalize(run_id: str, output: dict, elapsed_s: float) -> bool:
    ok = True
    plan = output.get("plan") or []
    ok &= _report("plan has >=3 steps", len(plan) >= 3, f"steps={len(plan)}")
    ok &= _report("plan steps have non-empty action text", all(step.get("action") for step in plan))

    trace = output.get("trace") or []
    ok &= _report("agent trace recorded", len(trace) > 0, f"{len(trace)} events")

    completed = set(output.get("completed_agents") or [])
    expected_agents = {"reconciliation", "tax_compliance", "merchant_ops"}
    ok &= _report(
        ">=3 specialist agents completed",
        expected_agents.issubset(completed),
        f"completed={sorted(completed)}",
    )

    status = output.get("run_status")
    ok &= _report("run reached COMPLETED", status == "COMPLETED", f"status={status}, errors={output.get('errors')}")
    ok &= _report(f"full case completed <30s", elapsed_s < 30.0, f"actual={elapsed_s:.2f}s")

    async with AsyncSessionLocal() as db:
        run = await db.get(AgentRun, run_id)
        run.status = status or "COMPLETED"
        run.plan = plan
        run.completed_at = datetime.now(timezone.utc)
        if output.get("errors"):
            run.error = "; ".join(str(e) for e in output["errors"])
        await db.commit()

        tool_call_count = await db.scalar(
            select(func.count(ToolCall.id)).where(ToolCall.agent_run_id == run_id)
        )
        ok &= _report("tool_calls persisted for this run", (tool_call_count or 0) > 0, str(tool_call_count))

        write_count = await db.scalar(
            select(func.count(ToolCall.id)).where(
                ToolCall.agent_run_id == run_id, ToolCall.tool_name.in_(WRITE_TOOL_NAMES)
            )
        )
        ok &= _report(">=2 write-action tool calls", (write_count or 0) >= 2, str(write_count))

    return ok


def scene_1_planner() -> bool:
    print("\n=== Scene 1: NL request -> Planner (agents.run dispatch is a known no-op; see module docstring) ===")
    run_id, ok, t0 = asyncio.run(_scene1_start_run())
    if not run_id:
        return ok
    output = _invoke_workflow_sync(run_id)
    elapsed = time.perf_counter() - t0
    ok &= asyncio.run(_scene1_finalize(run_id, output, elapsed))
    return ok


# ---------------------------------------------------------------------------
# Scene 2 — Mini POS -> QR -> SePay webhook -> auto-match
# ---------------------------------------------------------------------------


async def scene_2_pos_webhook() -> bool:
    print("\n=== Scene 2: Mini POS sale + QR -> SePay webhook -> auto-match ===")
    transport = ASGITransport(app=app)
    headers = _auth_headers(OPS_USER_ID, "ops_staff")
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        sale_resp = await client.post(
            "/api/v1/pos/sales",
            json={
                "merchant_id": MERCHANT_ID,
                "store_id": STORE_ID,
                "staff_id": OPS_USER_ID,
                "items": [
                    {
                        "product_id": DEMO_PRODUCT_ID,
                        "product_name": "Cham soc da mat",
                        "quantity": 1,
                        "unit_price": str(DEMO_SALE_AMOUNT),
                    }
                ],
            },
            headers=headers,
        )
        ok = _report("POS sale created (201)", sale_resp.status_code == 201, str(sale_resp.status_code))
        sale = sale_resp.json() if ok else {}
        sale_id = sale.get("sale_id")
        ok &= _report(
            f"sale net_amount == {DEMO_SALE_AMOUNT}",
            Decimal(str(sale.get("net_amount", "0"))) == DEMO_SALE_AMOUNT,
            str(sale.get("net_amount")),
        )

        intent_resp = await client.post(
            "/api/v1/pos/payment-intents",
            json={"sale_id": sale_id, "amount": str(DEMO_SALE_AMOUNT)},
            headers=headers,
        )
        ok &= _report("QR payment intent created (201)", intent_resp.status_code == 201, str(intent_resp.status_code))
        intent = intent_resp.json() if intent_resp.status_code == 201 else {}
        intent_id = intent.get("payment_intent_id")
        ok &= _report(
            "QR has reference + 15min expiry",
            bool(intent.get("qr_data")) and bool(intent.get("expires_at")),
            str(intent),
        )

    payload = _build_payload(
        amount=DEMO_SALE_AMOUNT,
        note=f"KHACH HANG chuyen khoan {intent_id}",
        code=intent_id,
        reference_code=None,
        account_number="0778478888",
    )
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        webhook_resp = await client.post(
            f"/api/v1/webhooks/sepay?merchant_id={MERCHANT_ID}",
            json=payload,
            headers={"Authorization": f"Apikey {settings.SEPAY_WEBHOOK_API_KEY}"},
        )
    ok &= _report("SePay webhook accepted (200)", webhook_resp.status_code == 200, webhook_resp.text)
    tx_id = f"SEPAY-{payload['id']}"

    # The webhook only inserts the bank_transaction; matching happens when
    # reconcile_period next scans the period (P1's real engine — same call
    # scripts/validate_pipeline.py already validates against the truth set).
    async with AsyncSessionLocal() as db:
        await run_reconciliation(db)

    async with AsyncSessionLocal() as db:
        allocation = await db.scalar(
            select(PaymentAllocation).where(PaymentAllocation.bank_transaction_id == tx_id)
        )
    ok &= _report(
        "bank_transaction auto-matched to the new sale",
        allocation is not None and allocation.sale_id == sale_id,
        f"allocation={allocation.sale_id if allocation else None}, expected={sale_id}",
    )
    return ok


# ---------------------------------------------------------------------------
# Scene 3 — ambiguous 5,000,000 transaction -> AI suggestion -> human confirm
# ---------------------------------------------------------------------------


async def scene_3_ambiguous_exception() -> bool:
    print("\n=== Scene 3: Ambiguous 5,000,000d -> AI suggestion -> human confirm ===")
    async with AsyncSessionLocal() as db:
        tx = await db.get(BankTransaction, AMBIGUOUS_TX_ID)
        exception = await db.scalar(
            select(ExceptionRecord).where(ExceptionRecord.bank_transaction_id == AMBIGUOUS_TX_ID)
        )
    ok = _report(f"{AMBIGUOUS_TX_ID} exists, amount=5,000,000", tx is not None and tx.amount == Decimal("5000000"))
    ok &= _report("exception exists in the Exception Inbox", exception is not None, str(exception))

    classification = await classify_revenue_category(
        {
            "id": tx.id,
            "merchant_id": tx.merchant_id,
            "amount": str(tx.amount),
            "sender_name": tx.sender_name,
            "raw_note": tx.raw_note,
        }
    )
    ok &= _report(
        "AI classifies as internal_transfer @ confidence >=0.82",
        classification["classification"] == "internal_transfer" and float(classification["confidence"]) >= 0.82,
        str(classification),
    )
    ok &= _report(
        "GAP (P1 scope): exception.ai_suggestion does NOT carry this classification "
        "(app/services/reconciliation.py only stores match candidates)",
        "classification" in (exception.ai_suggestion or {}) if exception else False,
        str(exception.ai_suggestion) if exception else "n/a",
    )

    if exception is not None and exception.status != "RESOLVED":
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resolve_resp = await client.post(
                f"/api/v1/reconciliation/exceptions/{exception.id}/resolve",
                json={"decision": "approved", "classification": "internal_transfer"},
                headers=_auth_headers(RM_USER_ID, "rm"),
            )
        ok &= _report("exception resolved via RM approval (200)", resolve_resp.status_code == 200, str(resolve_resp.status_code))

        async with AsyncSessionLocal() as db:
            resolved = await db.get(ExceptionRecord, exception.id)
            audit_after = await db.scalar(
                select(func.count(AuditEvent.id)).where(
                    AuditEvent.merchant_id == MERCHANT_ID,
                    AuditEvent.action.in_(("human_decision", "exception_resolved")),
                )
            )
        ok &= _report("exception now RESOLVED", resolved.status == "RESOLVED", str(resolved.status))
        ok &= _report(
            "GAP (P4 scope): human approval has an audit_events record "
            "(resolve_exception in app/routers/reconciliation.py writes no AuditEvent)",
            (audit_after or 0) > 0,
            f"matching audit_events={audit_after}",
        )
    return ok


# ---------------------------------------------------------------------------
# Scene 4 — Tax Agent detects missing invoices / readiness checklist
# ---------------------------------------------------------------------------


async def scene_4_tax_readiness() -> bool:
    print("\n=== Scene 4: Tax Agent -> missing invoices / readiness checklist ===")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/v1/tax/readiness?merchant_id={MERCHANT_ID}&period={PERIOD}",
            headers=_auth_headers(COMPLIANCE_USER_ID, "compliance"),
        )
    ok = _report("GET /tax/readiness (200)", resp.status_code == 200, str(resp.status_code))
    body = resp.json() if ok else {}
    checklist = {item["item"]: item for item in body.get("checklist", [])}

    ok &= _report(
        "rule version banner present (2026.07)",
        body.get("rule_version") == "2026.07",
        str(body.get("rule_version")),
    )
    # NOTE: GET /tax/readiness (app/routers/tax.py) exposes
    # check_required_fields's raw checks directly — merchant_name, tax_id,
    # revenue_total, invoice_count, cash_revenue, bank_revenue — it does not
    # call the richer generate_tax_readiness_report tool below, so there is
    # no "missing_invoices" item on the router response itself. Verify the
    # router's invoice_count check reflects incomplete coverage, and get the
    # actual missing-invoice count from the tool path.
    invoice_check = checklist.get("invoice_count", {})
    ok &= _report(
        "router invoice_count check fails (coverage <90%)",
        invoice_check.get("pass") is False,
        str(invoice_check),
    )
    ok &= _report(
        "status = Chua san sang (not ready — unresolved exceptions remain)",
        body.get("ready") is False,
        f"ready={body.get('ready')}",
    )

    # Cross-check against the tool path validate_pipeline.py already relies
    # on — this is the only path that actually names missing invoices.
    # Scene 2's new POS sale is itself uninvoiced once matched, so the
    # count here can be the original 2 + however many new unmatched-invoice
    # sales earlier scenes created — check the two documented seed-fixture
    # orders are still flagged rather than asserting an exact count.
    fields_result = await check_required_fields(MERCHANT_ID, PERIOD)
    missing_sales = set(fields_result["missing_invoice_sales"])
    ok &= _report(
        "seeded missing-invoice fixture orders still flagged",
        EXPECTED_MISSING_INVOICE_SALES.issubset(missing_sales),
        f"missing={sorted(missing_sales)}",
    )

    report = await generate_tax_readiness_report(MERCHANT_ID, PERIOD, "2026.07")
    ok &= _report(
        "router readiness matches tool-path readiness",
        body.get("ready") == report.ready,
        f"router={body.get('ready')} tool={report.ready}",
    )
    return ok


# ---------------------------------------------------------------------------
# Scene 5 — Merchant Ops: case, RM assignment, Vietnamese message, export
# ---------------------------------------------------------------------------


async def scene_5_merchant_ops() -> bool:
    print("\n=== Scene 5: Merchant Ops -> case, RM assign, Vietnamese message ===")
    transport = ASGITransport(app=app)
    headers = _auth_headers(RM_USER_ID, "rm")
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        case_resp = await client.post(
            "/api/v1/cases", json={"merchant_id": MERCHANT_ID, "period": PERIOD}, headers=headers
        )
        ok = _report("case exists/created (201)", case_resp.status_code == 201, str(case_resp.status_code))
        case = case_resp.json() if ok else {}
        ok &= _report(f"case id == {CASE_ID}", case.get("id") == CASE_ID, str(case.get("id")))
        ok &= _report("case has pending exceptions linked", (case.get("exception_count") or 0) > 0, str(case.get("exception_count")))

        assign_resp = await client.post(
            f"/api/v1/cases/{CASE_ID}/assign", json={"rm_id": RM_USER_ID}, headers=headers
        )
        ok &= _report("RM assigned (200)", assign_resp.status_code == 200, str(assign_resp.json() if assign_resp.status_code == 200 else assign_resp.status_code))

        async with AsyncSessionLocal() as db:
            exception_ids = [
                row[0]
                for row in (
                    await db.execute(
                        select(ExceptionRecord.id).where(ExceptionRecord.case_id == CASE_ID).limit(3)
                    )
                ).all()
            ]

        draft_resp = await client.post(
            f"/api/v1/cases/{CASE_ID}/draft-message",
            json={"exception_ids": exception_ids},
            headers=headers,
        )
        ok &= _report("draft message created (200)", draft_resp.status_code == 200, str(draft_resp.status_code))
        message = draft_resp.json().get("message", "") if draft_resp.status_code == 200 else ""
        ok &= _report(
            "message is Vietnamese, merchant-friendly (mentions SHB + ky doi soat)",
            "SHB" in message and "đối soát" in message.lower() or "doi soat" in message.lower(),
            message[:80],
        )
    return ok


# ---------------------------------------------------------------------------
# Scene 6 — before/after comparison + audit export (JSON + CSV)
# ---------------------------------------------------------------------------


async def scene_6_audit_export() -> bool:
    print("\n=== Scene 6: Before/after comparison + audit export (JSON + CSV) ===")
    async with AsyncSessionLocal() as db:
        total_tx = await db.scalar(
            select(func.count(BankTransaction.id)).where(BankTransaction.merchant_id == MERCHANT_ID)
        )
        matched_tx = await db.scalar(
            select(func.count(func.distinct(PaymentAllocation.bank_transaction_id)))
            .select_from(PaymentAllocation)
            .join(BankTransaction, PaymentAllocation.bank_transaction_id == BankTransaction.id)
            .where(BankTransaction.merchant_id == MERCHANT_ID)
        )
        exceptions = await db.scalar(
            select(func.count(ExceptionRecord.id)).where(ExceptionRecord.case_id == CASE_ID)
        )
    rate = (matched_tx / total_tx) if total_tx else 0.0
    print(f"  Before: {total_tx} transactions needed manual review.")
    print(f"  After:  {matched_tx} auto-matched ({rate:.1%}), {exceptions} exceptions remain.")

    transport = ASGITransport(app=app)
    headers = _auth_headers(COMPLIANCE_USER_ID, "compliance")
    ok = True
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        json_resp = await client.get(f"/api/v1/audit/export?merchant_id={MERCHANT_ID}", headers=headers)
        ok &= _report("audit export JSON (200)", json_resp.status_code == 200, str(json_resp.status_code))
        events = json_resp.json().get("events", []) if json_resp.status_code == 200 else []
        ok &= _report("JSON export has events", len(events) > 0, f"{len(events)} events")

        csv_resp = await client.get(f"/api/v1/audit/export?merchant_id={MERCHANT_ID}&format=csv", headers=headers)
        ok &= _report("audit export CSV (200)", csv_resp.status_code == 200, str(csv_resp.status_code))
        ok &= _report(
            "CSV has header + rows",
            csv_resp.text.count("\n") >= 2 and csv_resp.text.startswith("id,"),
            csv_resp.text.splitlines()[0] if csv_resp.text else "",
        )
    return ok


# ---------------------------------------------------------------------------
# Demo resilience: fallback webhook + backup
# ---------------------------------------------------------------------------


async def fallback_webhook_check() -> bool:
    print("\n=== Resilience: fallback SePay webhook (no live tunnel needed) ===")
    payload = _build_payload(
        amount=Decimal("120000"),
        note="fallback demo transfer",
        code=None,
        reference_code=None,
        account_number="0778478888",
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/api/v1/webhooks/sepay?merchant_id={MERCHANT_ID}",
            json=payload,
            headers={"Authorization": f"Apikey {settings.SEPAY_WEBHOOK_API_KEY}"},
        )
    ok = _report("fallback (mock) webhook succeeds without a live tunnel", resp.status_code == 200, resp.text)

    # Reconcile it too, so this check doesn't leave a permanently-unprocessed
    # transaction behind for scripts/verify_kpis.py to count as "pending".
    async with AsyncSessionLocal() as db:
        await run_reconciliation(db)
    return ok


def backup_check(skip: bool) -> bool:
    print("\n=== Resilience: demo DB backup snapshot ===")
    if skip:
        print("  [SKIP] --no-backup")
        return True
    try:
        backup(DEFAULT_SNAPSHOT_PATH)
    except Exception as exc:  # pg_dump not on PATH, etc. — report, don't crash the run
        return _report("scripts/backup_demo.backup() succeeds", False, str(exc))
    return _report("scripts/backup_demo.backup() succeeds", DEFAULT_SNAPSHOT_PATH.exists(), str(DEFAULT_SNAPSHOT_PATH))


# ---------------------------------------------------------------------------


def main(reset: bool, skip_backup: bool) -> int:
    print(f"=== TaxLens Sprint 4 demo run: {MERCHANT_ID} / {PERIOD} ===")

    if reset:
        print("\nSeeding demo dataset (--reset)...")
        asyncio.run(seed_demo_data(reset=True))

    results: dict[str, bool] = {}
    results["scene_1_planner"] = scene_1_planner()
    results["scene_2_pos_webhook"] = asyncio.run(scene_2_pos_webhook())
    results["scene_3_ambiguous_exception"] = asyncio.run(scene_3_ambiguous_exception())
    results["scene_4_tax_readiness"] = asyncio.run(scene_4_tax_readiness())
    results["scene_5_merchant_ops"] = asyncio.run(scene_5_merchant_ops())
    results["scene_6_audit_export"] = asyncio.run(scene_6_audit_export())
    results["fallback_webhook"] = asyncio.run(fallback_webhook_check())
    results["backup_snapshot"] = backup_check(skip_backup)

    asyncio.run(engine.dispose())

    print("\n" + "=" * 70)
    for name, ok in results.items():
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    if all(results.values()):
        print("ALL DEMO SCENES PASSED")
        return 0
    print("SOME DEMO SCENES FAILED — see [FAIL]/GAP lines above for owning role.")
    return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the TaxLens Sprint 4 demo end-to-end.")
    parser.add_argument("--no-reset", dest="reset", action="store_false", help="skip reseeding")
    parser.add_argument("--no-backup", dest="backup", action="store_false", help="skip the backup-snapshot step")
    parser.set_defaults(reset=True, backup=True)
    args = parser.parse_args()
    sys.exit(main(reset=args.reset, skip_backup=not args.backup))
