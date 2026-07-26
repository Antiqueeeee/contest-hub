from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.encrypted import EncryptedString


class Contestant(Base):
    __tablename__ = "contestants"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # 邮箱加密存储（个保法第 51 条）；email_hash 为 HMAC 盲索引，登录/查重用
    email: Mapped[str] = mapped_column(EncryptedString(512), nullable=False)
    email_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    # Nullable: id_number is collected lazily at first contest registration
    # (最小必要原则), then bound to the account and reused.
    id_number: Mapped[str | None] = mapped_column(EncryptedString(512), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # 自助注销：标记注销时间并清除账号 PII，报名记录保留关联（匿名化）。
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
