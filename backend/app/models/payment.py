from sqlalchemy import Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class PaymentIntent(Base):
    __tablename__ = "payment_intents"

    id = Column(String(30), primary_key=True)
    sale_id = Column(String(30), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), default="PENDING", nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bank_transaction_id = Column(String(30), ForeignKey("bank_transactions.id", ondelete="RESTRICT"), nullable=True)
    payment_intent_id = Column(String(30), ForeignKey("payment_intents.id", ondelete="SET NULL"), nullable=True)
    sale_id = Column(String(30), ForeignKey("sales.id", ondelete="RESTRICT"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    allocation_type = Column(String(20), default="PAYMENT", nullable=False)
    match_method = Column(String(20), nullable=True)
    confidence = Column(Numeric(5, 2), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
