from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String(20), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    merchant_id = Column(String(20), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=True)
    type = Column(String(50), nullable=False)  # exception, case_update, agent_run, support, system
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    link = Column(String(200), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
