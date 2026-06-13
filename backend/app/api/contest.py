from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.contest import ContestCreate, ContestUpdate, ContestOut
from app.services import contest_service

admin_router = APIRouter(prefix="/api/admin/contests", tags=["赛事管理"])
public_router = APIRouter(prefix="/api/public/contests", tags=["前台赛事"])


@admin_router.get("", response_model=dict)
async def list_contests(
    keyword: str = Query(default=""),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    items, total = await contest_service.list_contests(db, keyword, status, page, page_size)
    return {"items": [ContestOut.model_validate(c).model_dump() for c in items], "total": total, "page": page, "page_size": page_size}


@admin_router.get("/{contest_id}", response_model=ContestOut)
async def get_contest(contest_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await contest_service.get_contest(db, contest_id)


@admin_router.post("", response_model=ContestOut, status_code=201)
async def create_contest(data: ContestCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await contest_service.create_contest(db, data, current_user["user_id"])


@admin_router.put("/{contest_id}", response_model=ContestOut)
async def update_contest(contest_id: int, data: ContestUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await contest_service.update_contest(db, contest_id, data)


@admin_router.patch("/{contest_id}/status")
async def update_status(contest_id: int, status: str = Query(...), db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    contest = await contest_service.update_contest_status(db, contest_id, status)
    return {"message": "状态已更新", "status": contest.status.value}


@admin_router.post("/{contest_id}/copy", response_model=ContestOut)
async def copy_contest(contest_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await contest_service.copy_contest(db, contest_id, current_user["user_id"])


@admin_router.delete("/{contest_id}")
async def delete_contest(contest_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    await contest_service.delete_contest(db, contest_id)
    return {"message": "赛事已删除"}


# --- Public ---

@public_router.get("/timezones")
async def timezone_options():
    from app.utils.timezone import TZ_OPTIONS
    return TZ_OPTIONS


@public_router.get("")
async def public_contests_list(db: AsyncSession = Depends(get_db)):
    items, _ = await contest_service.list_contests(db, page=1, page_size=50)
    visible = [ContestOut.model_validate(c).model_dump() for c in items if c.status.value not in ("draft", "cancelled")]
    return {"items": visible, "total": len(visible)}


@public_router.get("/{contest_id}", response_model=ContestOut)
async def public_contest_detail(contest_id: int, db: AsyncSession = Depends(get_db)):
    c = await contest_service.get_contest(db, contest_id)
    if c.status.value in ("draft", "cancelled"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="赛事不存在")
    return c
