from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.site_content import SiteContent
from app.utils.audit import log_event

admin_router = APIRouter(prefix="/api/admin/site-content", tags=["站点内容管理"])
public_router = APIRouter(prefix="/api/public/site-content", tags=["前台站点内容"])


class SiteContentUpdate(BaseModel):
    content: str


@admin_router.get("/{page_key}")
async def get_content(page_key: str, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(select(SiteContent).where(SiteContent.page_key == page_key))
    row = result.scalar_one_or_none()
    return {"page_key": page_key, "content": row.content if row else ""}


@admin_router.put("/{page_key}")
async def update_content(page_key: str, data: SiteContentUpdate, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(select(SiteContent).where(SiteContent.page_key == page_key))
    row = result.scalar_one_or_none()
    if row:
        row.content = data.content
    else:
        row = SiteContent(page_key=page_key, content=data.content)
        db.add(row)
    await db.commit()
    await log_event(db, "update_site_content", operator=current_user["username"], operator_id=current_user["user_id"],
                    target=page_key, target_type="site_content", result="success", request=request)
    return {"message": "保存成功", "page_key": page_key}


@public_router.get("/{page_key}")
async def get_public_content(page_key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SiteContent).where(SiteContent.page_key == page_key))
    row = result.scalar_one_or_none()
    return {"page_key": page_key, "content": row.content if row else ""}
