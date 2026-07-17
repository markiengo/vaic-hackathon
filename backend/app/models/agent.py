from sqlalchemy import BigInteger, Column, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String(30), primary_key=True)
    case_id = Column(String(30), ForeignKey("reconciliation_cases.id", ondelete="SET NULL"), nullable=True)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False)
    user_id = Column(String(20), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    request_text = Column(Text, nullable=False)
    plan = Column(JSONB, nullable=True)
    status = Column(String(30), default="PENDING", nullable=False)
    started_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    error = Column(Text, nullable=True)


class ToolCall(Base):
    __tablename__ = "tool_calls"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_run_id = Column(String(30), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String(50), nullable=False)
    tool_name = Column(String(100), nullable=False)
    input_hash = Column(String(64), nullable=True)
    output_hash = Column(String(64), nullable=True)
    confidence = Column(Numeric(5, 2), nullable=True)
    rule_version = Column(String(20), nullable=True)
    called_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    duration_ms = Column(Integer, nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    actor_type = Column(String(20), nullable=False)
    actor_id = Column(String(50), nullable=False)
    agent_name = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)
    tool_name = Column(String(100), nullable=True)
    input_hash = Column(String(64), nullable=True)
    output_hash = Column(String(64), nullable=True)
    rule_version = Column(String(20), nullable=True)
    confidence = Column(Numeric(5, 2), nullable=True)
    approval_status = Column(String(20), nullable=True)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
