from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, and_
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class GroupTemplate(Base):
    __tablename__ = "contest_group_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["GroupItem"]] = relationship(
        back_populates="template", cascade="save-update, merge, refresh-expire, expunge",
        order_by="GroupItem.sort_order",
        primaryjoin="and_(GroupTemplate.id == GroupItem.template_id, GroupItem.deleted_at.is_(None))",
    )


class GroupItem(Base):
    __tablename__ = "contest_group_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("contest_group_templates.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    max_participants: Mapped[int] = mapped_column(Integer, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    template: Mapped[GroupTemplate] = relationship(back_populates="items")
