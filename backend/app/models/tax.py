from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class TaxClassification(Base):
    __tablename__ = "tax_classifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(String(30), nullable=True)
    classification = Column(String(50), nullable=False)
    classified_by = Column(String(20), nullable=True)
    confidence = Column(Numeric(5, 2), nullable=True)
    rule_version = Column(String(20), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class TaxRuleVersion(Base):
    __tablename__ = "tax_rule_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String(20), unique=True, nullable=False)
    merchant_type = Column(String(100), nullable=True)
    business_category = Column(String(100), nullable=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    required_fields = Column(JSONB, nullable=False)
    formula_or_validation = Column(JSONB, nullable=False)
    legal_source = Column(Text, nullable=False)
    approval_status = Column(String(20), default="PENDING", nullable=False)
    approved_by = Column(String(50), nullable=True)
    approved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
