from sqlalchemy import Column, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(String(30), primary_key=True)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False)
    account_number = Column(String(20), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    sender_name = Column(String(255), nullable=True)
    raw_note = Column(Text, nullable=True)
    normalized_note = Column(Text, nullable=True)
    ai_interpretation = Column(JSONB, nullable=True)
    transaction_type = Column(String(20), nullable=True)
    reference_number = Column(String(100), nullable=True)
    payment_code = Column(String(100), nullable=True)
    sub_account = Column(String(50), nullable=True)
    accumulated = Column(Numeric(15, 2), nullable=True)
    source = Column(String(50), nullable=False)
    source_id = Column(String(100), nullable=True)
    ingested_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    transaction_date = Column(TIMESTAMP(timezone=True), nullable=False)
