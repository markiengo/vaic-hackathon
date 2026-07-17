from sqlalchemy import Column, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(30), primary_key=True)
    sale_id = Column(String(30), ForeignKey("sales.id", ondelete="SET NULL"), nullable=True)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False)
    invoice_number = Column(String(50), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    invoice_date = Column(TIMESTAMP(timezone=True), nullable=True)
    status = Column(String(20), default="PENDING", nullable=False)
    source = Column(String(50), nullable=True)
    source_id = Column(String(100), nullable=True)
    ingested_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
