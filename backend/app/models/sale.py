from sqlalchemy import Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(String(30), primary_key=True)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False)
    store_id = Column(String(20), ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    device_id = Column(String(30), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    staff_id = Column(String(20), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    gross_amount = Column(Numeric(12, 2), nullable=False)
    discount = Column(Numeric(12, 2), default=0, nullable=False)
    net_amount = Column(Numeric(12, 2), nullable=False)
    payment_status = Column(String(20), default="UNPAID", nullable=False)
    invoice_status = Column(String(20), default="PENDING", nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SaleLine(Base):
    __tablename__ = "sale_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sale_id = Column(String(30), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(20), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)
