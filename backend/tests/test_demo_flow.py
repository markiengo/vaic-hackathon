"""Sprint 4 demo-flow tests (P5): pytest wrapper around the 6 demo scenes
from docs/04-delivery/00-work-split.md, reusing the exact scene functions
`python scripts/run_demo.py` runs for a human-readable dry run, so both
stay in sync instead of drifting apart.

Isolation note: Scene 2 fires a real SePay webhook that adds a new
bank_transaction for period 2026-07, which would shift the hardcoded
`== 23` / `== 8` counts other test files assert on
(tests/test_sepay_webhook.py, tests/test_end_to_end.py) if this file ran
in between them in the same session. This file's module fixture resets
and reseeds both before AND after running the scenes — the same
leave-no-trace pattern tests/test_sepay_webhook.py's own
`cleanup_test_tx` fixture already uses — so it is safe to include in a
plain `pytest tests` run regardless of file collection order.

Scene 1's agent-graph invocation runs LangGraph tool calls via
`asyncio.run()` internally (see app/agents/executor.py) and must not
execute inside pytest-asyncio's already-running loop, so it is offloaded
to a worker thread via `asyncio.to_thread`.

Two assertions are marked `xfail(strict=True)` for gaps this suite
surfaces but that are outside P5's file scope to fix (see
scripts/run_demo.py's module docstring for the full explanation):
reconciliation exceptions never get the tax classifier's suggestion
merged onto them (P1: app/services/reconciliation.py), and human
approvals via the resolve-exception endpoint write no audit_events row
(P4: app/routers/reconciliation.py). `strict=True` means these flip to a
hard failure (XPASS) the moment either gap is closed, so the marker
cannot silently rot once it's no longer true.
"""

from __future__ import annotations

import asyncio

import pytest
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.agent import AuditEvent
from app.models.reconciliation import ExceptionRecord
from app.tools import classify_revenue_category
from scripts.run_demo import (
    AMBIGUOUS_TX_ID,
    fallback_webhook_check,
    scene_1_planner,
    scene_2_pos_webhook,
    scene_3_ambiguous_exception,
    scene_4_tax_readiness,
    scene_5_merchant_ops,
    scene_6_audit_export,
)
from scripts.seed_data import seed as seed_demo_data
from scripts.validate_pipeline import MERCHANT_ID, PERIOD


@pytest.fixture(scope="module")
async def demo_results():
    await seed_demo_data(reset=True)

    results = {
        "scene_1": await asyncio.to_thread(scene_1_planner),
        "scene_2": await scene_2_pos_webhook(),
    }
    # Scene 3 depends on scene 2 having re-scanned the period (it calls
    # reconcile_period internally), which materializes the ambiguous
    # transaction's exception row.
    results["scene_3"] = await scene_3_ambiguous_exception()
    results["scene_4"] = await scene_4_tax_readiness()
    results["scene_5"] = await scene_5_merchant_ops()
    results["scene_6"] = await scene_6_audit_export()
    results["fallback_webhook"] = await fallback_webhook_check()

    yield results

    # Leave a clean, canonical baseline for any test file that collects
    # after this one in the same `pytest tests` run.
    await seed_demo_data(reset=True)


async def test_scene_1_planner_produces_plan_and_real_trace(demo_results):
    assert demo_results["scene_1"] is True


async def test_scene_2_pos_qr_webhook_auto_match(demo_results):
    assert demo_results["scene_2"] is True


async def test_scene_3_exception_resolved_by_rm(demo_results):
    """The parts of Scene 3 that work today: the exception exists and a
    human (RM) can resolve it through the real endpoint."""
    async with AsyncSessionLocal() as db:
        exception = await db.scalar(
            select(ExceptionRecord).where(ExceptionRecord.bank_transaction_id == AMBIGUOUS_TX_ID)
        )
    assert exception is not None
    assert exception.status == "RESOLVED"
    assert exception.human_decision is not None


async def test_scene_3_ai_classifies_ambiguous_transfer_correctly(demo_results):
    async with AsyncSessionLocal() as db:
        exception = await db.scalar(
            select(ExceptionRecord).where(ExceptionRecord.bank_transaction_id == AMBIGUOUS_TX_ID)
        )
    result = await classify_revenue_category(
        {
            "id": AMBIGUOUS_TX_ID,
            "merchant_id": MERCHANT_ID,
            "amount": "5000000",
            "sender_name": None,
            "raw_note": "ck cho em",
        }
    )
    assert result["classification"] == "internal_transfer"
    # >= not == : this fixture's own scene_3 already classified this
    # transaction once, and classify_revenue_category applies a
    # prior-pattern confidence bonus on repeat classification (see
    # tests/test_tools.py's own equivalent lower-bound assertion).
    assert float(result["confidence"]) >= 0.82
    assert exception is not None


@pytest.mark.xfail(
    strict=True,
    reason="GAP (P1 scope): app/services/reconciliation.py's exception "
    "creation only stores match candidates in ai_suggestion, never "
    "classify_revenue_category's result. Flip to a plain assertion once fixed.",
)
async def test_scene_3_exception_carries_ai_classification(demo_results):
    async with AsyncSessionLocal() as db:
        exception = await db.scalar(
            select(ExceptionRecord).where(ExceptionRecord.bank_transaction_id == AMBIGUOUS_TX_ID)
        )
    assert exception is not None
    assert "classification" in (exception.ai_suggestion or {})


@pytest.mark.xfail(
    strict=True,
    reason="GAP (P4 scope): app/routers/reconciliation.py::resolve_exception "
    "writes no audit_events row for the human decision. Flip to a plain "
    "assertion once fixed.",
)
async def test_scene_3_human_decision_is_audit_logged(demo_results):
    async with AsyncSessionLocal() as db:
        count = await db.scalar(
            select(AuditEvent.id).where(
                AuditEvent.action.in_(("human_decision", "exception_resolved", "human_approval"))
            ).limit(1)
        )
    assert count is not None


async def test_scene_4_tax_readiness_checklist(demo_results):
    assert demo_results["scene_4"] is True


async def test_scene_5_merchant_ops_case_and_message(demo_results):
    assert demo_results["scene_5"] is True


async def test_scene_6_audit_export_json_and_csv(demo_results):
    assert demo_results["scene_6"] is True


async def test_fallback_sepay_webhook_without_live_tunnel(demo_results):
    assert demo_results["fallback_webhook"] is True
