from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Result(Base):
    __tablename__ = "results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contest_id: Mapped[int] = mapped_column(ForeignKey("contests.id"), nullable=False, index=True)
    registration_id: Mapped[int] = mapped_column(ForeignKey("registrations.id"), unique=True, nullable=False)
    scores: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    total_score: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    award_id: Mapped[int | None] = mapped_column(ForeignKey("awards.id"), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    registration: Mapped["Registration"] = relationship(back_populates="result")
