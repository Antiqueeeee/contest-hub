from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AuditLog(Base):
    """Security audit log for compliance with China's Cybersecurity Law.

    Records authentication events, sensitive operations, data changes,
    and security incidents.  Retained for ≥6 months.
    """

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    operator: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    operator_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    target: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    target_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, default="")
    user_agent: Mapped[str] = mapped_column(Text, nullable=False, default="")
    result: Mapped[str] = mapped_column(String(20), nullable=False, default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
