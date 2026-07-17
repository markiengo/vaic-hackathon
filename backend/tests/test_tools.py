"""Integration tests for the 19 Sprint 2 agent tools (`app/tools/__init__.py`).

Tests against the seeded DB (conftest.py handles seeding) — these tools open
their own DB sessions internally, so there is no session fixture to inject.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.agent import AgentRun, AuditEvent, ToolCall
from app.tools import (
    assign_task_to_rm,
    check_required_fields,
    classify_revenue_category,
    create_case,
    create_draft_export,
    create_reconciliation_exception,
    draft_merchant_message,
    export_to_accounting_system,
    find_payment_reference,
    generate_tax_readiness_report,
    get_bank_transactions,
    get_cash_sessions,
    get_invoices,
    get_sales_orders,
    retrieve_tax_rules,
    score_match_candidates,
    send_confirmation_request,
    update_case_status,
    validate_rule_version,
)
from app.tools._tracing import agent_run_scope


# --- Bank / source retrieval tools -----------------------------------------


async def test_get_bank_transactions_returns_23():
    result = await get_bank_transactions("M001", "2026-07")
    assert len(result) == 23
    assert all(row["merchant_id"] == "M001" for row in result)


async def test_get_sales_orders_returns_30_with_lines():
    result = await get_sales_orders("M001", "2026-07")
    assert len(result) == 30
    order_1842 = next(row for row in result if row["id"] == "ORDER-1842")
    assert len(order_1842["lines"]) == 2
    assert order_1842["net_amount"] == "350000.00"


async def test_get_cash_sessions_returns_seeded_discrepancy():
    result = await get_cash_sessions("M001", "2026-07")
    assert len(result) == 1
    assert result[0]["discrepancy"] == "-120000.00"
    assert result[0]["status"] == "RECONCILED"


async def test_get_invoices_returns_28():
    result = await get_invoices("M001", "2026-07")
    assert len(result) == 28


async def test_find_payment_reference_found():
    result = await find_payment_reference("PAY-A8F21X")
    assert result is not None
    assert result["sale_id"] == "ORDER-1842"
    assert result["amount"] == "350000.00"


async def test_find_payment_reference_not_found():
    assert await find_payment_reference("PAY-NOPE99") is None


# --- Matching tools ---------------------------------------------------------


async def test_score_match_candidates_detects_ambiguous_pair():
    """The 2 sales sharing the 85,000 amount both score identically and low
    (duplicate-amount penalty applied), which is the documented mandatory
    human-review case — not an accident of scoring."""

    candidates = await score_match_candidates(
        "M001", Decimal("85000"), time_window_minutes=999999999
    )
    sale_ids = {candidate.sale_id for candidate in candidates}
    assert sale_ids == {"ORDER-1860", "ORDER-1861"}
    assert all(candidate.score == candidate.confidence * 100 for candidate in candidates)


async def test_score_match_candidates_no_match_returns_empty():
    candidates = await score_match_candidates("M001", Decimal("999999999"))
    assert candidates == []


async def test_create_reconciliation_exception_creates_case_if_missing():
    draft = await create_reconciliation_exception(
        case_id="CASE-M001-2026-07-test",
        merchant_id="M001",
        period="2026-07",
        exception_type="AMBIGUOUS_MATCH",
        reason="test reason",
    )
    assert draft.case_id == "CASE-M001-2026-07-test"
    assert draft.exception_type == "AMBIGUOUS_MATCH"
    assert draft.ai_suggestion["reason"] == "test reason"
    assert "exception_id" in draft.ai_suggestion


# --- Tax tools ---------------------------------------------------------------


async def test_retrieve_tax_rules_salon_beauty():
    """The literal Sprint 1/2 exit criterion."""
    rule = await retrieve_tax_rules("salon", "beauty")
    assert rule is not None
    assert rule["version"] == "2026.07"


async def test_validate_rule_version_2026_07():
    result = await validate_rule_version("2026.07")
    assert result["valid"] is True
    assert result["approval_status"] == "APPROVED"


async def test_classify_revenue_category_matches_documented_fixture():
    """classify_revenue_category(<ck cho em / 5,000,000 transaction>) ->
    {"classification": "internal_transfer", "confidence": 0.82} — the
    literal exit criterion (docs/05-domain/02-algorithm.md fixture)."""

    result = await classify_revenue_category(
        {
            "id": "SEPAY-902194815",
            "merchant_id": "M001",
            "amount": "5000000",
            "sender_name": None,
            "raw_note": "ck cho em",
        }
    )
    assert result["classification"] == "internal_transfer"
    assert result["confidence"] == 0.82


async def test_classify_revenue_category_purchase_payment():
    result = await classify_revenue_category(
        {
            "id": "SEPAY-902194970",
            "merchant_id": "M001",
            "amount": "2300000",
            "sender_name": "Nguyen Supplier",
            "raw_note": "nhap hang 20/10",
        }
    )
    assert result["classification"] == "purchase_payment"


async def test_check_required_fields_flags_two_missing_invoices():
    result = await check_required_fields("M001", "2026-07")
    assert set(result["missing_invoice_sales"]) == {"ORDER-1868", "ORDER-1869"}


async def test_generate_tax_readiness_report_not_ready_before_matching():
    """No reconciliation matching has run yet (Sprint 3 integration), so the
    bank_reconciliation and unclassified_transactions checklist items must
    honestly fail — this is not a bug, it is the correct pre-Sprint-3 state."""

    report = await generate_tax_readiness_report("M001", "2026-07", "2026.07")
    assert report.ready is False
    items = {item["item"]: item for item in report.checklist}
    assert items["rule_version_valid"]["pass"] is True
    assert items["missing_invoices"]["value"] == 2


async def test_create_draft_export_gated_when_not_ready():
    result = await create_draft_export("M001", "2026-07", "2026.07", "json")
    assert result.error is not None
    assert "ERR-TAX-002" in result.error


# --- Case tools --------------------------------------------------------------


async def test_create_case_is_idempotent():
    first = await create_case("M001", "2026-07")
    second = await create_case("M001", "2026-07")
    assert first["id"] == second["id"] == "CASE-M001-2026-07"
    assert first["created"] is True
    assert second["created"] is False


async def test_assign_task_to_rm_updates_case():
    await create_case("M001", "2026-07")
    result = await assign_task_to_rm("CASE-M001-2026-07", "U003")
    assert result["assigned_rm_id"] == "U003"
    assert result["status"] == "WAITING_FOR_CONFIRMATION"


async def test_assign_task_to_rm_unknown_case_errors():
    result = await assign_task_to_rm("CASE-DOES-NOT-EXIST", "U003")
    assert result["error"]["code"] == "ERR-CASE-001"


async def test_draft_merchant_message_embeds_confirmation_link():
    await create_case("M001", "2026-07")
    await create_reconciliation_exception(
        case_id="CASE-M001-2026-07",
        merchant_id="M001",
        period="2026-07",
        exception_type="AMBIGUOUS_MATCH",
        reason="test",
    )
    draft = await draft_merchant_message("CASE-M001-2026-07", "M001", "2026-07")
    assert draft.requires_rm_review is True
    assert "confirm/" in draft.message
    assert "Salon Hoa" in draft.message


async def test_send_confirmation_request_valid_token():
    await create_case("M001", "2026-07")
    exception_draft = await create_reconciliation_exception(
        case_id="CASE-M001-2026-07",
        merchant_id="M001",
        period="2026-07",
        exception_type="NO_MATCH",
        reason="test",
    )
    exception_id = exception_draft.ai_suggestion["exception_id"]

    from app.services.confirmation_tokens import generate_confirmation_token

    token = generate_confirmation_token(exception_id)
    result = await send_confirmation_request(token, "test message")
    assert result["status"] == "SENT"
    assert result["exception_id"] == exception_id


async def test_send_confirmation_request_invalid_token():
    result = await send_confirmation_request("not-a-valid-token", "test")
    assert result["error"]["code"] == "ERR-TOKEN-001"


async def test_update_case_status_rejects_invalid_status():
    await create_case("M001", "2026-07")
    result = await update_case_status("CASE-M001-2026-07", "NOT_A_REAL_STATUS")
    assert result["error"]["code"] == "ERR-GEN-001"


async def test_update_case_status_valid():
    await create_case("M001", "2026-07")
    result = await update_case_status("CASE-M001-2026-07", "CLOSED")
    assert result["status"] == "CLOSED"


async def test_export_to_accounting_system_csv():
    result = await export_to_accounting_system("M001", "2026-07", "csv")
    assert result.error is None
    assert "MaChungTu" in result.output


# --- Traceability (DEC-001/DEC-004) ------------------------------------------


async def test_tool_call_writes_audit_event_without_agent_context():
    async with AsyncSessionLocal() as db:
        before = await db.scalar(select(func.count(AuditEvent.id)))

    await retrieve_tax_rules("salon", "beauty")

    async with AsyncSessionLocal() as db:
        after = await db.scalar(select(func.count(AuditEvent.id)))
    assert after == before + 1


async def test_tool_call_writes_tool_calls_row_with_agent_context():
    run_id = "RUN-TEST-TRACE-001"
    async with AsyncSessionLocal() as db:
        db.add(
            AgentRun(
                id=run_id, merchant_id="M001", request_text="test", status="EXECUTING"
            )
        )
        await db.commit()

    async with agent_run_scope(run_id, "tax_compliance"):
        await retrieve_tax_rules("salon", "beauty")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ToolCall).where(ToolCall.agent_run_id == run_id))
        calls = result.scalars().all()

    assert len(calls) == 1
    assert calls[0].agent_name == "tax_compliance"
    assert calls[0].tool_name == "retrieve_tax_rules"
    assert calls[0].input_hash is not None
    assert calls[0].output_hash is not None
    assert calls[0].duration_ms is not None
