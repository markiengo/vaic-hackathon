from sqlalchemy import Boolean, Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String(20), primary_key=True)
    name = Column(String(255), nullable=False)
    business_type = Column(String(100))
    business_category = Column(String(100))
    tax_id = Column(String(50))
    contact_phone = Column(String(20))
    contact_email = Column(String(255))
    status = Column(String(20), default="ACTIVE", nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Store(Base):
    __tablename__ = "stores"

    id = Column(String(20), primary_key=True)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String(20))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class Device(Base):
    __tablename__ = "devices"

    id = Column(String(30), primary_key=True)
    store_id = Column(String(20), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100))
    device_type = Column(String(50))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
