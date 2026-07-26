from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ExportTask(Base):
    """数据导出任务记录（落库持久化，替代原内存字典）。

    导出文件含明文身份证号，由清理任务按 export_retention_days 定期删除。
    """

    __tablename__ = "export_tasks"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="processing")
    file_path: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    filename: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    error: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
