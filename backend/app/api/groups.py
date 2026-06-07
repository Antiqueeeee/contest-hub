from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.contest import ContestGroup

router = APIRouter(prefix="/api/admin/groups", tags=["组别管理"])


class GroupCreate(BaseModel):
    contest_id: int | None = None
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    max_participants: int = 0
    sort_order: int = 0


class GroupUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    max_participants: int | None = None
    sort_order: int | None = None


@router.get("")
async def list_groups(contest_id: int | None = None, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    query = select(ContestGroup)
    if contest_id:
        query = query.where(ContestGroup.contest_id == contest_id)
    query = query.order_by(ContestGroup.sort_order)
    result = await db.execute(query)
    groups = result.scalars().all()
    return {
        "items": [
            {"id": g.id, "contest_id": g.contest_id, "name": g.name,
             "description": g.description, "max_participants": g.max_participants,
             "sort_order": g.sort_order}
            for g in groups
        ]
    }


@router.post("")
async def create_group(data: GroupCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    g = ContestGroup(**data.model_dump())
    db.add(g)
    await db.commit()
    await db.refresh(g)
    return {"id": g.id, "contest_id": g.contest_id, "name": g.name, "description": g.description, "max_participants": g.max_participants, "sort_order": g.sort_order}


@router.put("/{group_id}")
async def update_group(group_id: int, data: GroupUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(select(ContestGroup).where(ContestGroup.id == group_id))
    g = result.scalar_one_or_none()
    if not g:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="组别不存在")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(g, k, v)
    await db.commit()
    return {"message": "更新成功"}


@router.delete("/{group_id}")
async def delete_group(group_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(select(ContestGroup).where(ContestGroup.id == group_id))
    g = result.scalar_one_or_none()
    if not g:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="组别不存在")
    await db.delete(g)
    await db.commit()
    return {"message": "已删除"}
