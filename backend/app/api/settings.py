from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.services import settings_service
from app.utils.audit import log_event

admin_router = APIRouter(prefix="/api/admin/settings", tags=["系统设置"])


class SettingsUpdate(BaseModel):
    values: dict[str, int]


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
