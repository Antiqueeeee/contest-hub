from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ConsentLog(Base):
    """同意记录流水（个保法：平台应能证明已取得同意）。

    每次授予/撤回写一条记录，最新一条决定当前状态。
    匿名报名时 contestant_id 为 NULL，以 email 标识。
    """

    __tablename__ = "consent_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contestant_id: Mapped[int | None] = mapped_column(ForeignKey("contestants.id"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    # privacy = 隐私政策；id_number = 身份证号收集（敏感个人信息单独同意）
    consent_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    # granted / withdrawn
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
