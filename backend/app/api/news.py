from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.news import NewsCategoryCreate, NewsCategoryUpdate, NewsCategoryOut, NewsCreate, NewsUpdate, NewsOut
from app.services import news_service

admin_router = APIRouter(prefix="/api/admin/news", tags=["新闻管理"])
public_router = APIRouter(prefix="/api/public", tags=["前台新闻"])


# --- Categories ---

@admin_router.get("/categories", response_model=list[NewsCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await news_service.list_categories(db)


@admin_router.post("/categories", response_model=NewsCategoryOut)
async def create_category(data: NewsCategoryCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await news_service.create_category(db, data)


@admin_router.put("/categories/{cat_id}", response_model=NewsCategoryOut)
async def update_category(cat_id: int, data: NewsCategoryUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await news_service.update_category(db, cat_id, data)


@admin_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    await news_service.delete_category(db, cat_id)
    return {"message": "分类已删除"}


# --- News ---

@admin_router.get("", response_model=dict)
async def list_news(
    keyword: str = Query(default=""),
    category_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    items, total = await news_service.list_news(db, keyword, category_id, status, page, page_size)
    result = []
    for n in items:
        d = NewsOut.model_validate(n).model_dump()
        if n.author:
            d['author_name'] = n.author.name
        result.append(d)
    return {"items": result, "total": total, "page": page, "page_size": page_size}


@admin_router.get("/{news_id}", response_model=NewsOut)
async def get_news_detail(news_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await news_service.get_news(db, news_id)


@admin_router.post("", response_model=NewsOut)
async def create_news(data: NewsCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await news_service.create_news(db, data, current_user["user_id"])


@admin_router.put("/{news_id}", response_model=NewsOut)
async def update_news(news_id: int, data: NewsUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await news_service.update_news(db, news_id, data)


@admin_router.patch("/{news_id}/status")
async def update_status(news_id: int, status: str = Query(...), db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    news = await news_service.update_news_status(db, news_id, status)
    return {"message": "状态已更新", "status": news.status.value}


@admin_router.delete("/{news_id}")
async def delete_news(news_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    await news_service.delete_news(db, news_id)
    return {"message": "新闻已删除"}


# --- Public ---

@public_router.get("/news")
async def public_news_list(page: int = Query(default=1, ge=1), page_size: int = Query(default=10, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    items, total = await news_service.list_public_news(db, page, page_size)
    return {"items": [NewsOut.model_validate(n).model_dump() for n in items], "total": total}


@public_router.get("/news/{news_id}", response_model=NewsOut)
async def public_news_detail(news_id: int, db: AsyncSession = Depends(get_db)):
    return await news_service.get_public_news_detail(db, news_id)
