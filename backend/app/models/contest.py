import enum
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum, Integer, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ContestStatus(str, enum.Enum):
    draft = "draft"
    open = "open"
    ongoing = "ongoing"
    finished = "finished"
    cancelled = "cancelled"


class Contest(Base):
    __tablename__ = "contests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cover_image: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    location: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    registration_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    registration_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    max_participants: Mapped[int] = mapped_column(Integer, default=0)
    score_categories: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[ContestStatus] = mapped_column(Enum(ContestStatus), default=ContestStatus.draft, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Shanghai", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    groups: Mapped[list["ContestGroup"]] = relationship(back_populates="contest", cascade="all, delete-orphan")
    awards: Mapped[list["Award"]] = relationship(back_populates="contest", cascade="all, delete-orphan")
    fields: Mapped[list["ContestField"]] = relationship(back_populates="contest", cascade="all, delete-orphan")


class ContestGroup(Base):
    __tablename__ = "contest_groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contest_id: Mapped[int | None] = mapped_column(ForeignKey("contests.id", ondelete="SET NULL"), nullable=True)
    template_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    max_participants: Mapped[int] = mapped_column(Integer, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    contest: Mapped[Contest] = relationship(back_populates="groups")


class Award(Base):
    __tablename__ = "awards"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contest_id: Mapped[int] = mapped_column(ForeignKey("contests.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    contest: Mapped[Contest] = relationship(back_populates="awards")


class ContestField(Base):
    __tablename__ = "contest_fields"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contest_id: Mapped[int] = mapped_column(ForeignKey("contests.id", ondelete="CASCADE"), nullable=False)
    field_name: Mapped[str] = mapped_column(String(50), nullable=False)
    field_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")  # text/number/select/date/textarea
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    contest: Mapped[Contest] = relationship(back_populates="fields")
