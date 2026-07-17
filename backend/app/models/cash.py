from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class CashSession(Base):
    __tablename__ = "cash_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(String(20), ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    staff_id = Column(String(20), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    opening_cash = Column(Numeric(12, 2), nullable=False)
    expected_cash = Column(Numeric(12, 2), nullable=True)
    counted_cash = Column(Numeric(12, 2), nullable=True)
    cash_expenses = Column(Numeric(12, 2), default=0, nullable=False)
    discrepancy = Column(Numeric(12, 2), nullable=True)
    discrepancy_reason = Column(Text, nullable=True)
    status = Column(String(20), default="OPEN", nullable=False)
    opened_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    closed_at = Column(TIMESTAMP(timezone=True), nullable=True)
