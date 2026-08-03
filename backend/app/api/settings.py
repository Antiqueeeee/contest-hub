from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.system_setting import SystemSetting
from app.services import settings_service
from app.utils.audit import log_event

admin_router = APIRouter(prefix="/api/admin/settings", tags=["系统设置"])
public_router = APIRouter(prefix="/api/public/settings", tags=["前台设置"])


class SettingsUpdate(BaseModel):
    values: dict[str, int]


class MinorProtectionUpdate(BaseModel):
    enabled: bool


@admin_router.get("")
async def get_settings(db: AsyncSession = Depends(get_db),
                       current_user: dict = Depends(get_current_user)):
    return {"items": await settings_service.get_all_settings(db)}


@admin_router.put("")
async def update_settings(data: SettingsUpdate, request: Request,
                          db: AsyncSession = Depends(get_db),
                          current_user: dict = Depends(get_current_user)):
    await settings_service.update_settings(db, data.values)
    await log_event(db, "update_settings", operator=current_user["username"],
                    operator_id=current_user["user_id"], detail=data.values,
                    result="success", request=request)
    return {"message": "设置已保存"}


# ── 未成年人保护模块系统级开关 ─────────────────────────────────


@admin_router.get("/minor-protection")
async def get_minor_protection(db: AsyncSession = Depends(get_db),
                               current_user: dict = Depends(get_current_user)):
    return {"enabled": await settings_service.get_minor_protection_enabled(db)}


@admin_router.put("/minor-protection")
async def update_minor_protection(data: MinorProtectionUpdate, request: Request,
                                  db: AsyncSession = Depends(get_db),
                                  current_user: dict = Depends(get_current_user)):
    row = (await db.execute(
        select(SystemSetting).where(SystemSetting.key == settings_service.MINOR_PROTECTION_MODE_KEY)
    )).scalar_one_or_none()
    value = "on" if data.enabled else "off"
    if row:
        row.value = value
    else:
        db.add(SystemSetting(key=settings_service.MINOR_PROTECTION_MODE_KEY, value=value))
    await db.commit()
    await log_event(db, "update_settings", operator=current_user["username"],
                    operator_id=current_user["user_id"],
                    detail={"minor_protection_mode": value}, result="success", request=request)
    return {"message": "设置已保存", "enabled": data.enabled}


@public_router.get("/minor-protection")
async def public_minor_protection(db: AsyncSession = Depends(get_db)):
    """前台读取系统级未成年人保护开关（报名页/隐私政策页按此展示）。"""
    return {"enabled": await settings_service.get_minor_protection_enabled(db)}
