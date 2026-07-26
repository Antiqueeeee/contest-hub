"""Data retention cleanup (个保法第 19 条：保存期限最小化).

由应用内后台任务每日执行一次（单进程部署适用），共三项：

1. 软删除超过 deleted_registration_purge_days 的报名记录 → 物理删除
2. 赛事结束超过 registration_retention_days → 匿名报名 form_data 中的
   身份证号清除（账号报名的身份证号本就不在报名记录中）
3. 导出文件（含明文身份证号）超过 export_retention_days → 删除磁盘文件
   及任务记录
"""

import logging
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contest import Contest
from app.models.export_task import ExportTask
from app.models.registration import Registration
from app.services.settings_service import get_setting_int

logger = logging.getLogger("cleanup")


async def run_cleanup_once(db: AsyncSession) -> dict:
    """Run all retention cleanup tasks once.  Returns counters for logging."""
    now = datetime.now(timezone.utc)
    stats = {"purged_registrations": 0, "cleared_id_numbers": 0, "deleted_exports": 0}

    # 1. 物理清除软删已久的报名记录
    #    排除已有成绩的报名：results.registration_id 外键无级联，
    #    保留成绩链优先（有成绩的报名不物理删除）。
    from app.models.result import Result
    purge_days = await get_setting_int(db, "deleted_registration_purge_days")
    has_result = select(Result.id).where(Result.registration_id == Registration.id).exists()
    result = await db.execute(
        delete(Registration).where(
            Registration.deleted_at < now - timedelta(days=purge_days),
            ~has_result,
        )
    )
    stats["purged_registrations"] = result.rowcount or 0

    # 2. 清除已结束赛事匿名报名中的身份证号
    retention_days = await get_setting_int(db, "registration_retention_days")
    cutoff = now - timedelta(days=retention_days)
    ended_contest_ids = select(Contest.id).where(Contest.end_date < cutoff.replace(tzinfo=None))
    anon_regs = (await db.execute(
        select(Registration).where(
            Registration.contest_id.in_(ended_contest_ids),
            Registration.contestant_id.is_(None),
        )
    )).scalars().all()
    for reg in anon_regs:
        if reg.form_data and reg.form_data.get("id_number"):
            form_data = dict(reg.form_data)
            form_data.pop("id_number")
            reg.form_data = form_data
            stats["cleared_id_numbers"] += 1

    # 3. 删除过期导出文件与任务记录
    #    先删 DB 记录并提交，再删磁盘文件——避免事务回滚后记录指向已删文件。
    export_days = await get_setting_int(db, "export_retention_days")
    old_tasks = (await db.execute(
        select(ExportTask).where(ExportTask.created_at < now - timedelta(days=export_days))
    )).scalars().all()
    file_paths = [t.file_path for t in old_tasks if t.file_path]
    for task in old_tasks:
        await db.delete(task)
        stats["deleted_exports"] += 1

    await db.commit()

    for path in file_paths:
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError as e:
                logger.warning("failed to remove export file %s: %s", path, e)
    return stats
