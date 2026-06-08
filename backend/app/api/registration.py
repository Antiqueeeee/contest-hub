from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.contestant_auth import get_optional_contestant
from app.schemas.registration import RegistrationCreate, RegistrationOut, ExportRequest
from app.services import registration_service, export_service

admin_router = APIRouter(prefix="/api/admin/registrations", tags=["报名管理"])
public_router = APIRouter(prefix="/api/public/contests", tags=["前台报名"])
export_router = APIRouter(prefix="/api/admin/export", tags=["数据导出"])


# --- Admin ---

@admin_router.get("", response_model=dict)
async def list_registrations(
    contest_id: int | None = Query(default=None),
    group_id: int | None = Query(default=None),
    keyword: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    items, total = await registration_service.list_registrations(db, contest_id, group_id, keyword, page, page_size)
    return {"items": [RegistrationOut.model_validate(r).model_dump() for r in items], "total": total, "page": page, "page_size": page_size}


@admin_router.get("/{reg_id}", response_model=RegistrationOut)
async def get_registration(reg_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await registration_service.get_registration(db, reg_id)


@admin_router.delete("/{reg_id}")
async def delete_registration(reg_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    await registration_service.soft_delete_registration(db, reg_id)
    return {"message": "报名记录已删除，数据将在30天后自动清除"}


# --- Public ---

@public_router.post("/{contest_id}/register", response_model=RegistrationOut, status_code=201)
async def submit_registration(
    contest_id: int,
    data: RegistrationCreate,
    db: AsyncSession = Depends(get_db),
    contestant: dict | None = Depends(get_optional_contestant),
):
    data.contest_id = contest_id
    return await registration_service.register(db, data, contestant_id=contestant["contestant_id"] if contestant else None)


# --- Export ---

@export_router.post("")
async def submit_export(data: ExportRequest, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    task_id = await export_service.submit_export_task(
        db, data.export_type, data.contest_id, data.fields, data.group_ids
    )
    return {"task_id": task_id, "message": "导出任务已提交"}


@export_router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, current_user: dict = Depends(get_current_user)):
    task = export_service.get_export_task_status(task_id)
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"task_id": task_id, "status": task["status"]}


@export_router.get("/download/{task_id}")
async def download_export(task_id: str, current_user: dict = Depends(get_current_user)):
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    task = export_service.get_export_task_status(task_id)
    if not task or task["status"] != "completed":
        raise HTTPException(status_code=404, detail="文件不存在或尚未生成完成")
    if not task.get("file_path"):
        raise HTTPException(status_code=404, detail="文件不存在")
    filename = task.get("filename", f"export_{task_id}.xlsx")
    return FileResponse(task["file_path"], filename=filename,
                        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
