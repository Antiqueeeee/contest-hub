"""System settings stored in DB, editable from the admin console."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_setting import SystemSetting

# key -> (default, 中文说明)
SETTING_DEFS: dict[str, tuple[int, str]] = {
    "registration_retention_days": (180, "赛事结束后报名数据（匿名报名的身份证号）保留天数"),
    "deleted_registration_purge_days": (30, "软删除的报名记录物理清除天数"),
    "export_retention_days": (1, "导出文件在服务器上的保留天数"),
}


async def get_setting_int(db: AsyncSession, key: str) -> int:
    """Read an integer setting, falling back to its default."""
    default = SETTING_DEFS[key][0]
    row = (await db.execute(select(SystemSetting).where(SystemSetting.key == key))).scalar_one_or_none()
    if not row or not row.value:
        return default
    try:
        return int(row.value)
    except ValueError:
        return default


async def get_all_settings(db: AsyncSession) -> list[dict]:
    rows = (await db.execute(select(SystemSetting))).scalars().all()
    stored = {r.key: r.value for r in rows}
    result = []
    for key, (default, label) in SETTING_DEFS.items():
        raw = stored.get(key, "")
        try:
            value = int(raw) if raw else default
        except ValueError:
            value = default
        result.append({"key": key, "value": value, "default": default, "label": label})
    return result


async def update_settings(db: AsyncSession, values: dict[str, int]) -> None:
    for key, value in values.items():
        if key not in SETTING_DEFS:
            continue
        if value < 1 or value > 3650:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"{key} 需在 1-3650 天之间")
        row = (await db.execute(select(SystemSetting).where(SystemSetting.key == key))).scalar_one_or_none()
        if row:
            row.value = str(value)
        else:
            db.add(SystemSetting(key=key, value=str(value)))
    await db.commit()
