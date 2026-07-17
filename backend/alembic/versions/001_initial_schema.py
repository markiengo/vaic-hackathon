"""001 initial schema

Revision ID: 001
Revises:
Create Date: 2026-07-17

Creates all 19 tables for TaxLens MVP.
Table order respects FK dependencies (parents before children).
All FK cascade rules are set at DB level via ondelete= in ForeignKey constraints.
No pgvector extension — RAG uses prompt-embedded business guidance.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. merchants — no FK dependencies
    # ------------------------------------------------------------------
    op.create_table(
        "merchants",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("business_type", sa.String(100), nullable=True),
        sa.Column("business_category", sa.String(100), nullable=True),
        sa.Column("tax_id", sa.String(50), nullable=True),
        sa.Column("contact_phone", sa.String(20), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), server_default="ACTIVE", nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 2. stores — FK → merchants (CASCADE DELETE)
    # ------------------------------------------------------------------
    op.create_table(
        "stores",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 3. devices — FK → stores (CASCADE DELETE)
    # ------------------------------------------------------------------
    op.create_table(
        "devices",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("store_id", sa.String(20), sa.ForeignKey("stores.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=True),
        sa.Column("device_type", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("TRUE"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 4. users — FK → merchants (SET NULL on merchant delete)
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("TRUE"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 5. products — FK → merchants (CASCADE DELETE)
    # ------------------------------------------------------------------
    op.create_table(
        "products",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("is_service", sa.Boolean, server_default=sa.text("TRUE"), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("TRUE"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 6. sales — FK → merchants (RESTRICT), stores (RESTRICT),
    #            devices (SET NULL), users/staff (SET NULL)
    # ------------------------------------------------------------------
    op.create_table(
        "sales",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("store_id", sa.String(20), sa.ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("device_id", sa.String(30), sa.ForeignKey("devices.id", ondelete="SET NULL"), nullable=True),
        sa.Column("staff_id", sa.String(20), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("gross_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount", sa.Numeric(12, 2), server_default=sa.text("0"), nullable=False),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_status", sa.String(20), server_default="UNPAID", nullable=False),
        sa.Column("invoice_status", sa.String(20), server_default="PENDING", nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 7. sale_lines — FK → sales (CASCADE DELETE), products (SET NULL)
    # ------------------------------------------------------------------
    op.create_table(
        "sale_lines",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("sale_id", sa.String(30), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.String(20), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product_name", sa.String(255), nullable=False),
        sa.Column("quantity", sa.Integer, server_default=sa.text("1"), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
    )

    # ------------------------------------------------------------------
    # 8. bank_transactions — FK → merchants (RESTRICT)
    # ------------------------------------------------------------------
    op.create_table(
        "bank_transactions",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("account_number", sa.String(20), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("sender_name", sa.String(255), nullable=True),
        sa.Column("raw_note", sa.Text, nullable=True),
        sa.Column("normalized_note", sa.Text, nullable=True),
        sa.Column("ai_interpretation", postgresql.JSONB, nullable=True),
        sa.Column("transaction_type", sa.String(20), nullable=True),
        sa.Column("reference_number", sa.String(100), nullable=True),
        sa.Column("payment_code", sa.String(100), nullable=True),
        sa.Column("sub_account", sa.String(50), nullable=True),
        sa.Column("accumulated", sa.Numeric(15, 2), nullable=True),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String(100), nullable=True),
        sa.Column("ingested_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("transaction_date", sa.TIMESTAMP(timezone=True), nullable=False),
    )

    # ------------------------------------------------------------------
    # 9. payment_intents — FK → sales (CASCADE DELETE), merchants (CASCADE)
    # ------------------------------------------------------------------
    op.create_table(
        "payment_intents",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("sale_id", sa.String(30), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(20), server_default="PENDING", nullable=False),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 10. payment_allocations — FK → bank_transactions (RESTRICT),
    #                            payment_intents (SET NULL), sales (RESTRICT)
    # ------------------------------------------------------------------
    op.create_table(
        "payment_allocations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("bank_transaction_id", sa.String(30), sa.ForeignKey("bank_transactions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("payment_intent_id", sa.String(30), sa.ForeignKey("payment_intents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sale_id", sa.String(30), sa.ForeignKey("sales.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("allocation_type", sa.String(20), server_default="PAYMENT", nullable=False),
        sa.Column("match_method", sa.String(20), nullable=True),
        sa.Column("confidence", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 11. cash_sessions — FK → stores (SET NULL), users (SET NULL)
    # ------------------------------------------------------------------
    op.create_table(
        "cash_sessions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("store_id", sa.String(20), sa.ForeignKey("stores.id", ondelete="SET NULL"), nullable=True),
        sa.Column("staff_id", sa.String(20), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("opening_cash", sa.Numeric(12, 2), nullable=False),
        sa.Column("expected_cash", sa.Numeric(12, 2), nullable=True),
        sa.Column("counted_cash", sa.Numeric(12, 2), nullable=True),
        sa.Column("cash_expenses", sa.Numeric(12, 2), server_default=sa.text("0"), nullable=False),
        sa.Column("discrepancy", sa.Numeric(12, 2), nullable=True),
        sa.Column("discrepancy_reason", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), server_default="OPEN", nullable=False),
        sa.Column("opened_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("closed_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    # ------------------------------------------------------------------
    # 12. invoices — FK → sales (SET NULL), merchants (RESTRICT)
    # ------------------------------------------------------------------
    op.create_table(
        "invoices",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("sale_id", sa.String(30), sa.ForeignKey("sales.id", ondelete="SET NULL"), nullable=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("invoice_number", sa.String(50), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("invoice_date", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), server_default="PENDING", nullable=False),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("source_id", sa.String(100), nullable=True),
        sa.Column("ingested_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 13. tax_rule_versions — no FK dependencies
    # ------------------------------------------------------------------
    op.create_table(
        "tax_rule_versions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("version", sa.String(20), unique=True, nullable=False),
        sa.Column("merchant_type", sa.String(100), nullable=True),
        sa.Column("business_category", sa.String(100), nullable=True),
        sa.Column("effective_from", sa.Date, nullable=False),
        sa.Column("effective_to", sa.Date, nullable=True),
        sa.Column("required_fields", postgresql.JSONB, nullable=False),
        sa.Column("formula_or_validation", postgresql.JSONB, nullable=False),
        sa.Column("legal_source", sa.Text, nullable=False),
        sa.Column("approval_status", sa.String(20), server_default="PENDING", nullable=False),
        sa.Column("approved_by", sa.String(50), nullable=True),
        sa.Column("approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 14. tax_classifications — FK → merchants (CASCADE DELETE)
    # ------------------------------------------------------------------
    op.create_table(
        "tax_classifications",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_id", sa.String(30), nullable=True),
        sa.Column("classification", sa.String(50), nullable=False),
        sa.Column("classified_by", sa.String(20), nullable=True),
        sa.Column("confidence", sa.Numeric(5, 2), nullable=True),
        sa.Column("rule_version", sa.String(20), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 15. reconciliation_cases — FK → merchants (CASCADE DELETE),
    #                             users/rm (SET NULL)
    # ------------------------------------------------------------------
    op.create_table(
        "reconciliation_cases",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period", sa.String(10), nullable=False),
        sa.Column("status", sa.String(30), server_default="OPEN", nullable=False),
        sa.Column("priority", sa.String(10), server_default="MEDIUM", nullable=False),
        sa.Column("assigned_rm_id", sa.String(20), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tax_rule_version", sa.String(20), nullable=True),
        sa.Column("human_approvals", postgresql.JSONB, server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 16. exceptions — FK → reconciliation_cases (CASCADE DELETE),
    #                  bank_transactions (SET NULL), sales (SET NULL),
    #                  users/decision_by (SET NULL)
    # ------------------------------------------------------------------
    op.create_table(
        "exceptions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("case_id", sa.String(30), sa.ForeignKey("reconciliation_cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bank_transaction_id", sa.String(30), sa.ForeignKey("bank_transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sale_id", sa.String(30), sa.ForeignKey("sales.id", ondelete="SET NULL"), nullable=True),
        sa.Column("exception_type", sa.String(30), nullable=False),
        sa.Column("ai_suggestion", postgresql.JSONB, nullable=True),
        sa.Column("human_decision", sa.String(50), nullable=True),
        sa.Column("human_decision_by", sa.String(20), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("human_decision_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), server_default="PENDING", nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # 17. agent_runs — FK → reconciliation_cases (SET NULL),
    #                  merchants (RESTRICT), users (SET NULL)
    # ------------------------------------------------------------------
    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("case_id", sa.String(30), sa.ForeignKey("reconciliation_cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("user_id", sa.String(20), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("request_text", sa.Text, nullable=False),
        sa.Column("plan", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(30), server_default="PENDING", nullable=False),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("error", sa.Text, nullable=True),
    )

    # ------------------------------------------------------------------
    # 18. tool_calls — FK → agent_runs (CASCADE DELETE)
    # ------------------------------------------------------------------
    op.create_table(
        "tool_calls",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("agent_run_id", sa.String(30), sa.ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("agent_name", sa.String(50), nullable=False),
        sa.Column("tool_name", sa.String(100), nullable=False),
        sa.Column("input_hash", sa.String(64), nullable=True),
        sa.Column("output_hash", sa.String(64), nullable=True),
        sa.Column("confidence", sa.Numeric(5, 2), nullable=True),
        sa.Column("rule_version", sa.String(20), nullable=True),
        sa.Column("called_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("duration_ms", sa.Integer, nullable=True),
    )

    # ------------------------------------------------------------------
    # 19. audit_events — FK → merchants (SET NULL); BIGSERIAL PK
    # ------------------------------------------------------------------
    op.create_table(
        "audit_events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("actor_type", sa.String(20), nullable=False),
        sa.Column("actor_id", sa.String(50), nullable=False),
        sa.Column("agent_name", sa.String(50), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("tool_name", sa.String(100), nullable=True),
        sa.Column("input_hash", sa.String(64), nullable=True),
        sa.Column("output_hash", sa.String(64), nullable=True),
        sa.Column("rule_version", sa.String(20), nullable=True),
        sa.Column("confidence", sa.Numeric(5, 2), nullable=True),
        sa.Column("approval_status", sa.String(20), nullable=True),
        sa.Column("merchant_id", sa.String(20), sa.ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # Indexes (from data-models.md)
    # ------------------------------------------------------------------
    op.create_index("idx_bank_tx_merchant_date", "bank_transactions", ["merchant_id", "transaction_date"])
    op.create_index("idx_bank_tx_source", "bank_transactions", ["source", "source_id"])
    # Conditional (partial) index — status = 'PENDING'
    op.create_index(
        "idx_payment_intents_pending",
        "payment_intents",
        ["id"],
        postgresql_where=sa.text("status = 'PENDING'"),
    )
    op.create_index("idx_sales_merchant_status", "sales", ["merchant_id", "payment_status"])
    op.create_index("idx_exceptions_case_status", "exceptions", ["case_id", "status"])
    op.create_index("idx_audit_events_merchant_time", "audit_events", ["merchant_id", "timestamp"])
    op.create_index("idx_agent_runs_case", "agent_runs", ["case_id"])
    op.create_index("idx_tool_calls_run", "tool_calls", ["agent_run_id"])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index("idx_tool_calls_run", table_name="tool_calls")
    op.drop_index("idx_agent_runs_case", table_name="agent_runs")
    op.drop_index("idx_audit_events_merchant_time", table_name="audit_events")
    op.drop_index("idx_exceptions_case_status", table_name="exceptions")
    op.drop_index("idx_sales_merchant_status", table_name="sales")
    op.drop_index("idx_payment_intents_pending", table_name="payment_intents")
    op.drop_index("idx_bank_tx_source", table_name="bank_transactions")
    op.drop_index("idx_bank_tx_merchant_date", table_name="bank_transactions")

    # Drop tables in reverse FK dependency order
    op.drop_table("audit_events")
    op.drop_table("tool_calls")
    op.drop_table("agent_runs")
    op.drop_table("exceptions")
    op.drop_table("reconciliation_cases")
    op.drop_table("tax_classifications")
    op.drop_table("tax_rule_versions")
    op.drop_table("invoices")
    op.drop_table("cash_sessions")
    op.drop_table("payment_allocations")
    op.drop_table("payment_intents")
    op.drop_table("bank_transactions")
    op.drop_table("sale_lines")
    op.drop_table("sales")
    op.drop_table("products")
    op.drop_table("users")
    op.drop_table("devices")
    op.drop_table("stores")
    op.drop_table("merchants")
