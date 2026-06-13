import enum
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum, Integer, DateTime, ForeignKey, func, and_
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class NewsStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class NewsCategory(Base):
    __tablename__ = "news_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    news: Mapped[list["News"]] = relationship(
        back_populates="category",
        primaryjoin="and_(NewsCategory.id == News.category_id, News.deleted_at.is_(None))",
    )


class News(Base):
    __tablename__ = "news"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("news_categories.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    cover_image: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[NewsStatus] = mapped_column(Enum(NewsStatus), default=NewsStatus.draft, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    category: Mapped[NewsCategory] = relationship(back_populates="news")
    author: Mapped["User"] = relationship()
