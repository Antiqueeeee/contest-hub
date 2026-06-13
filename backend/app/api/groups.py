from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.group_template import GroupTemplate, GroupItem

router = APIRouter(prefix="/api/admin/groups", tags=["组别管理"])


# --- Templates ---

@router.get("/templates")
async def list_templates(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(GroupTemplate)
        .options(selectinload(GroupTemplate.items))
        .where(GroupTemplate.deleted_at.is_(None))
        .order_by(GroupTemplate.sort_order)
    )
    templates = result.unique().scalars().all()
    return {
        "items": [
            {
                "id": t.id, "name": t.name, "description": t.description, "sort_order": t.sort_order,
                "items": [
                    {"id": i.id, "name": i.name, "description": i.description,
                     "max_participants": i.max_participants, "sort_order": i.sort_order}
                    for i in t.items
                ]
            }
            for t in templates
        ]
    }


class TemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    sort_order: int = 0


class TemplateUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    sort_order: int | None = None


@router.post("/templates")
async def create_template(data: TemplateCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    t = GroupTemplate(**data.model_dump())
    db.add(t); await db.commit(); await db.refresh(t)
    return {"id": t.id, "name": t.name}


@router.put("/templates/{template_id}")
async def update_template(template_id: int, data: TemplateUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    r = await db.execute(select(GroupTemplate).where(GroupTemplate.id == template_id, GroupTemplate.deleted_at.is_(None)))
    t = r.scalar_one_or_none()
    if not t: raise HTTPException(status_code=404, detail="不存在")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(t, k, v)
    await db.commit()
    return {"message": "更新成功"}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    r = await db.execute(select(GroupTemplate).where(GroupTemplate.id == template_id, GroupTemplate.deleted_at.is_(None)))
    t = r.scalar_one_or_none()
    if not t: raise HTTPException(status_code=404, detail="不存在")
    now = datetime.now(timezone.utc)
    t.deleted_at = now
    for i in t.items:
        i.deleted_at = now
    await db.commit()
    return {"message": "已删除"}


# --- Items ---

class ItemCreate(BaseModel):
    template_id: int
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    max_participants: int = 0
    sort_order: int = 0


class ItemUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    max_participants: int | None = None
    sort_order: int | None = None


@router.post("/items")
async def create_item(data: ItemCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    i = GroupItem(**data.model_dump())
    db.add(i); await db.commit(); await db.refresh(i)
    return {"id": i.id, "name": i.name}


@router.put("/items/{item_id}")
async def update_item(item_id: int, data: ItemUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    r = await db.execute(select(GroupItem).where(GroupItem.id == item_id, GroupItem.deleted_at.is_(None)))
    i = r.scalar_one_or_none()
    if not i: raise HTTPException(status_code=404, detail="不存在")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(i, k, v)
    await db.commit()
    return {"message": "更新成功"}


@router.delete("/items/{item_id}")
async def delete_item(item_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    r = await db.execute(select(GroupItem).where(GroupItem.id == item_id, GroupItem.deleted_at.is_(None)))
    i = r.scalar_one_or_none()
    if not i: raise HTTPException(status_code=404, detail="不存在")
    i.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "已删除"}
