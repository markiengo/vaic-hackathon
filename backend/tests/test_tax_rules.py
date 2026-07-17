"""Integration tests for the Tax Rules Engine.

Tests against real Supabase DB with seed data (conftest.py handles seeding).
"""

from __future__ import annotations

import pytest

from app.core.database import AsyncSessionLocal
from app.services.tax_rules import (
    check_required_fields,
    generate_tax_readiness_report,
    retrieve_tax_rules,
    validate_rule_version,
)

pytestmark = pytest.mark.usefixtures("seeded_db")


async def test_retrieve_tax_rules_returns_2026_07():
    """retrieve_tax_rules('hộ_kinh_doanh', 'beauty_services') returns version 2026.07."""
    async with AsyncSessionLocal() as session:
        result = await retrieve_tax_rules(session, "hộ_kinh_doanh", "beauty_services")

    assert result is not None
    assert result["version"] == "2026.07"
    assert result["approval_status"] == "APPROVED"
    assert result["legal_source"] == "Thông tư 40/2021/TT-BTC"
    assert "merchant_name" in result["required_fields"]
    assert "invoice_coverage" in result["formula_or_validation"]


async def test_retrieve_tax_rules_no_match():
    """retrieve_tax_rules with non-matching category returns None."""
    async with AsyncSessionLocal() as session:
        result = await retrieve_tax_rules(session, "hộ_kinh_doanh", "nonexistent_category")

    assert result is None


async def test_validate_rule_version_2026_07():
    """validate_rule_version('2026.07') returns valid=true, status=APPROVED, effective=true."""
    async with AsyncSessionLocal() as session:
        result = await validate_rule_version(session, "2026.07")

    assert result["valid"] is True
    assert result["status"] == "APPROVED"
    assert result["effective"] is True


async def test_validate_rule_version_not_found():
    """validate_rule_version with unknown version returns valid=false."""
    async with AsyncSessionLocal() as session:
        result = await validate_rule_version(session, "9999.99")

    assert result["valid"] is False
    assert result["status"] == "NOT_FOUND"
    assert result["effective"] is False


async def test_check_required_fields_detects_missing_invoices():
    """check_required_fields('M001', '2026-07') detects 2 missing invoices (28/30 sales have invoices)."""
    async with AsyncSessionLocal() as session:
        result = await check_required_fields(session, "M001", "2026-07")

    # 28 invoices linked to 28 of 30 sales → 2 missing → fails
    assert "missing_invoices" in result["failed"]
    assert "missing_invoices" not in result["passed"]


async def test_check_required_fields_cash_session_not_reconciled():
    """check_required_fields detects cash session is not RECONCILED."""
    async with AsyncSessionLocal() as session:
        result = await check_required_fields(session, "M001", "2026-07")

    assert "cash_session_closure" in result["failed"]
    assert "cash_session_closure" not in result["passed"]


async def test_generate_tax_readiness_report_ready_false():
    """generate_tax_readiness_report returns ready=false due to cash session not reconciled."""
    async with AsyncSessionLocal() as session:
        report = await generate_tax_readiness_report(session, "M001", "2026-07", "2026.07")

    assert report["merchant_id"] == "M001"
    assert report["period"] == "2026-07"
    assert report["rule_version"] == "2026.07"
    assert report["legal_source"] == "Thông tư 40/2021/TT-BTC"
    assert report["ready"] is False

    checklist_items = {item["item"]: item for item in report["checklist"]}
    assert "rule_version_valid" in checklist_items
    assert checklist_items["rule_version_valid"]["passed"] is True
    assert "missing_invoices" in checklist_items
    assert checklist_items["missing_invoices"]["passed"] is False
    assert "cash_session_closure" in checklist_items
    assert checklist_items["cash_session_closure"]["passed"] is False
