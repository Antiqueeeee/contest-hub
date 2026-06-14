import os
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.carousel_slide import CarouselSlide
from app.config import get_settings
from app.utils.audit import log_event

admin_router = APIRouter(prefix="/api/admin/carousel", tags=["轮播图管理"])
public_router = APIRouter(prefix="/api/public/carousel", tags=["前台轮播图"])


class CarouselSlideCreate(BaseModel):
    title: str = ""
    image_url: str = ""
    link_url: str = ""
    sort_order: int = 0
    is_active: bool = True


class CarouselSlideUpdate(BaseModel):
    title: str = ""
    image_url: str = ""
    link_url: str = ""
    sort_order: int = 0
    is_active: bool = True


class ReorderItem(BaseModel):
    id: int
    sort_order: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem]


def _validate_link_url(url: str) -> str:
    """Only allow http/https or empty links (prevents javascript: XSS)."""
    if not url:
        return url
    parsed = urlparse(url)
    if parsed.scheme and parsed.scheme not in ("http", "https"):
        raise HTTPException(400, "链接只允许 http/https 协议")
    return url


def _delete_image_file(image_url: str) -> None:
    """Delete an uploaded image file from disk (if it lives under upload_dir)."""
    if not image_url or not image_url.startswith("/uploads/"):
        return
    settings = get_settings()
    filename = os.path.basename(image_url)
    if not filename:
        return
    file_path = Path(settings.upload_dir) / filename
    try:
        file_path.unlink(missing_ok=True)
    except Exception:
        pass


# ── Admin ──────────────────────────────────────────────

@admin_router.get("")
async def list_slides(db: AsyncSession = Depends(get_db), _current_user: dict = Depends(get_current_user)):
    result = await db.execute(
        select(CarouselSlide).order_by(CarouselSlide.sort_order, CarouselSlide.id)
    )
    return {"items": result.scalars().all()}


@admin_router.post("")
async def create_slide(data: CarouselSlideCreate, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    _validate_link_url(data.link_url)
    slide = CarouselSlide(**data.model_dump())
    db.add(slide)
    await db.commit()
    await db.refresh(slide)
    await log_event(db, "create_carousel", operator=current_user["username"], operator_id=current_user["user_id"],
                    target=data.title or str(slide.id), target_type="carousel", result="success", request=request)
    return slide


@admin_router.put("/{slide_id}")
async def update_slide(slide_id: int, data: CarouselSlideUpdate, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    _validate_link_url(data.link_url)
    result = await db.execute(select(CarouselSlide).where(CarouselSlide.id == slide_id))
    slide = result.scalar_one_or_none()
    if not slide:
        raise HTTPException(404, "轮播图不存在")
    old_url = slide.image_url
    for key, value in data.model_dump().items():
        setattr(slide, key, value)
    if old_url and old_url != data.image_url:
        _delete_image_file(old_url)
    await db.commit()
    await db.refresh(slide)
    await log_event(db, "update_carousel", operator=current_user["username"], operator_id=current_user["user_id"],
                    target=str(slide_id), target_type="carousel", result="success", request=request)
    return slide


@admin_router.delete("/{slide_id}")
async def delete_slide(slide_id: int, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    result = await db.execute(select(CarouselSlide).where(CarouselSlide.id == slide_id))
    slide = result.scalar_one_or_none()
    if not slide:
        raise HTTPException(404, "轮播图不存在")
    _delete_image_file(slide.image_url)
    await db.delete(slide)
    await db.commit()
    await log_event(db, "delete_carousel", operator=current_user["username"], operator_id=current_user["user_id"],
                    target=str(slide_id), target_type="carousel", result="success", request=request)
    return {"message": "删除成功"}


@admin_router.put("/reorder")
async def reorder_slides(data: ReorderRequest, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    ids = [item.id for item in data.items]
    rows = (await db.execute(select(CarouselSlide).where(CarouselSlide.id.in_(ids)))).scalars().all()
    slide_map = {s.id: s for s in rows}
    for item in data.items:
        if item.id in slide_map:
            slide_map[item.id].sort_order = item.sort_order
    await db.commit()
    await log_event(db, "reorder_carousel", operator=current_user["username"], operator_id=current_user["user_id"],
                    target="carousel", target_type="carousel", detail={"order": ids}, result="success", request=request)
    return {"message": "排序已更新"}


# ── Public ─────────────────────────────────────────────

@public_router.get("")
async def get_active_slides(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CarouselSlide)
        .where(CarouselSlide.is_active == True)
        .order_by(CarouselSlide.sort_order, CarouselSlide.id)
    )
    return {"items": result.scalars().all()}
