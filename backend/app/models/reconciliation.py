from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class ReconciliationCase(Base):
    __tablename__ = "reconciliation_cases"

    id = Column(String(30), primary_key=True)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    period = Column(String(10), nullable=False)
    status = Column(String(30), default="OPEN", nullable=False)
    priority = Column(String(10), default="MEDIUM", nullable=False)
    assigned_rm_id = Column(String(20), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tax_rule_version = Column(String(20), nullable=True)
    human_approvals = Column(JSONB, default=list, nullable=False)
    summary = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ExceptionRecord(Base):
    """
    Maps to the 'exceptions' table. Named ExceptionRecord to avoid shadowing
    the Python built-in Exception class.
    """
    __tablename__ = "exceptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(30), ForeignKey("reconciliation_cases.id", ondelete="CASCADE"), nullable=False)
    bank_transaction_id = Column(String(30), ForeignKey("bank_transactions.id", ondelete="SET NULL"), nullable=True)
    sale_id = Column(String(30), ForeignKey("sales.id", ondelete="SET NULL"), nullable=True)
    exception_type = Column(String(30), nullable=False)
    ai_suggestion = Column(JSONB, nullable=True)
    human_decision = Column(String(50), nullable=True)
    human_decision_by = Column(String(20), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    human_decision_at = Column(TIMESTAMP(timezone=True), nullable=True)
    status = Column(String(20), default="PENDING", nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
