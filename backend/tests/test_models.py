"""Basic model tests — verify all models import and have __tablename__."""

import pytest
from sqlalchemy.orm import DeclarativeBase

from app.core.database import Base
import app.models  # noqa: F401 — triggers registration of all models


EXPECTED_TABLES = {
    "merchants",
    "stores",
    "devices",
    "users",
    "products",
    "sales",
    "sale_lines",
    "bank_transactions",
    "payment_intents",
    "payment_allocations",
    "cash_sessions",
    "invoices",
    "tax_rule_versions",
    "tax_classifications",
    "reconciliation_cases",
    "exceptions",
    "agent_runs",
    "tool_calls",
    "audit_events",
}


def test_base_is_declarative_base():
    assert issubclass(Base, DeclarativeBase)


def test_all_19_tables_registered():
    tables = set(Base.metadata.tables.keys())
    assert len(tables) == 19, f"Expected 19 tables, got {len(tables)}: {tables}"


def test_expected_table_names_match():
    tables = set(Base.metadata.tables.keys())
    assert tables == EXPECTED_TABLES, f"Missing: {EXPECTED_TABLES - tables}, Extra: {tables - EXPECTED_TABLES}"


@pytest.mark.parametrize("table_name", sorted(EXPECTED_TABLES))
def test_each_table_has_tablename(table_name):
    table = Base.metadata.tables[table_name]
    assert table.name == table_name
