"""Tests for the Tax Rules Engine (`app/services/tax_rules.py`).

Pure-logic tests (category/type matching) need no DB. The rest are
integration tests against the seeded DB (conftest.py handles seeding).
"""

from __future__ import annotations

from app.core.database import AsyncSessionLocal
from app.services.tax_rules import (
    _category_matches,
    _type_matches,
    check_required_fields,
    retrieve_tax_rules,
    validate_rule_version,
)


# --- Pure-logic: category/type matching (no DB) ---------------------------


def test_category_matches_exact():
    assert _category_matches("beauty_services", "beauty_services")


def test_category_matches_loose_prefix():
    assert _category_matches("beauty_services", "beauty")
    assert _category_matches("beauty", "beauty_services")


def test_category_matches_case_insensitive():
    assert _category_matches("Beauty_Services", "BEAUTY")


def test_category_matches_none_is_wildcard():
    assert _category_matches(None, "beauty")
    assert _category_matches("beauty_services", None)


def test_category_matches_unrelated_rejected():
    assert not _category_matches("beauty_services", "retail")


def test_type_matches_exact_only():
    assert _type_matches("salon", "salon")
    assert not _type_matches("salon", "cafe")


def test_type_matches_none_is_wildcard():
    assert _type_matches(None, "salon")
    assert _type_matches("salon", None)


# --- Integration: against the seeded DB ------------------------------------


async def test_retrieve_tax_rules_returns_2026_07():
    """retrieve_tax_rules("salon", "beauty") returns version 2026.07.

    This is the literal exit criterion from docs/04-delivery/00-work-split.md
    Sprint 1. It requires loose category matching: the seeded rule's
    business_category is "beauty_services", not "beauty".
    """
    async with AsyncSessionLocal() as session:
        rule = await retrieve_tax_rules(session, "salon", "beauty")

    assert rule is not None
    assert rule.version == "2026.07"
    assert rule.approval_status == "APPROVED"
    assert rule.legal_source == "Thông tư 40/2021/TT-BTC"
    assert "merchant_name" in rule.required_fields
    assert "invoice_coverage" in rule.formula_or_validation


async def test_retrieve_tax_rules_no_match():
    async with AsyncSessionLocal() as session:
        rule = await retrieve_tax_rules(session, "salon", "nonexistent_category")

    assert rule is None


async def test_validate_rule_version_2026_07():
    async with AsyncSessionLocal() as session:
        result = await validate_rule_version(session, "2026.07")

    assert result.valid is True
    assert result.approval_status == "APPROVED"
    assert result.is_currently_effective is True
    assert result.reason is None


async def test_validate_rule_version_not_found():
    async with AsyncSessionLocal() as session:
        result = await validate_rule_version(session, "9999.99")

    assert result.valid is False
    assert result.reason == "RULE_VERSION_NOT_FOUND"


async def test_check_required_fields_detects_two_missing_invoices():
    """check_required_fields('M001', '2026-07') flags exactly the 2 cash
    sales seeded without an invoice (ORDER-1868, ORDER-1869) — at this
    point in the pipeline, cash sales are the only ones genuinely PAID."""
    async with AsyncSessionLocal() as session:
        result = await check_required_fields(session, "M001", "2026-07")

    assert result.rule_version == "2026.07"
    assert set(result.missing_invoice_sales) == {"ORDER-1868", "ORDER-1869"}

    checks_by_field = {check.field: check for check in result.checks}
    assert checks_by_field["merchant_name"].passed is True
    assert checks_by_field["tax_id"].passed is True
    assert checks_by_field["revenue_total"].passed is True
    assert checks_by_field["invoice_count"].passed is False
    assert checks_by_field["invoice_count"].detail == "6/8 paid sales invoiced"
