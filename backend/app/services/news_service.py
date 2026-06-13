from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from fastapi import HTTPException, status

from app.models.news import NewsCategory, News, NewsStatus
from app.schemas.news import NewsCategoryCreate, NewsCategoryUpdate, NewsCreate, NewsUpdate


# --- Categories ---

async def list_categories(db: AsyncSession) -> list[NewsCategory]:
    result = await db.execute(
        select(NewsCategory).where(NewsCategory.deleted_at.is_(None)).order_by(NewsCategory.sort_order)
    )
    return list(result.scalars().all())


async def create_category(db: AsyncSession, data: NewsCategoryCreate) -> NewsCategory:
    cat = NewsCategory(name=data.name, sort_order=data.sort_order)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


async def update_category(db: AsyncSession, cat_id: int, data: NewsCategoryUpdate) -> NewsCategory:
    result = await db.execute(
        select(NewsCategory).where(NewsCategory.id == cat_id, NewsCategory.deleted_at.is_(None))
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分类不存在")
    if data.name is not None:
        cat.name = data.name
    if data.sort_order is not None:
        cat.sort_order = data.sort_order
    await db.commit()
    await db.refresh(cat)
    return cat


async def delete_category(db: AsyncSession, cat_id: int):
    result = await db.execute(
        select(NewsCategory).where(NewsCategory.id == cat_id, NewsCategory.deleted_at.is_(None))
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分类不存在")
    cat.deleted_at = datetime.now(timezone.utc)
    # Soft-delete all news in this category
    news_result = await db.execute(
        select(News).where(News.category_id == cat_id, News.deleted_at.is_(None))
    )
    for n in news_result.scalars().all():
        n.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- News ---

async def list_news(
    db: AsyncSession,
    keyword: str = "",
    category_id: int | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[News], int]:
    query = select(News).options(joinedload(News.category), joinedload(News.author)).where(News.deleted_at.is_(None))
    count_query = select(func.count(News.id)).where(News.deleted_at.is_(None))

    if keyword:
        query = query.where(News.title.ilike(f"%{keyword}%"))
        count_query = count_query.where(News.title.ilike(f"%{keyword}%"))
    if category_id:
        query = query.where(News.category_id == category_id)
        count_query = count_query.where(News.category_id == category_id)
    if status:
        query = query.where(News.status == status)
        count_query = count_query.where(News.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(News.is_pinned.desc(), News.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.unique().scalars().all()), total


async def get_news(db: AsyncSession, news_id: int) -> News:
    result = await db.execute(
        select(News).options(joinedload(News.category)).where(News.id == news_id, News.deleted_at.is_(None))
    )
    news = result.unique().scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="新闻不存在")
    return news


async def create_news(db: AsyncSession, data: NewsCreate, author_id: int) -> News:
    news = News(
        author_id=author_id,
        status=NewsStatus.published,
        published_at=datetime.now(timezone.utc),
        **data.model_dump(exclude={'status'})
    )
    db.add(news)
    await db.commit()
    await db.refresh(news)
    return news


async def update_news(db: AsyncSession, news_id: int, data: NewsUpdate) -> News:
    result = await db.execute(
        select(News).where(News.id == news_id, News.deleted_at.is_(None))
    )
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="新闻不存在")
    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(news, key, val)
    await db.commit()
    await db.refresh(news)
    return news


async def update_news_status(db: AsyncSession, news_id: int, new_status: str) -> News:
    result = await db.execute(
        select(News).where(News.id == news_id, News.deleted_at.is_(None))
    )
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="新闻不存在")
    news.status = NewsStatus(new_status)
    if new_status == "published":
        news.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(news)
    return news


async def delete_news(db: AsyncSession, news_id: int):
    result = await db.execute(
        select(News).where(News.id == news_id, News.deleted_at.is_(None))
    )
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="新闻不存在")
    news.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Public ---

async def list_public_news(db: AsyncSession, page: int = 1, page_size: int = 10) -> tuple[list[News], int]:
    query = select(News).options(joinedload(News.category)).where(
        News.status == NewsStatus.published, News.deleted_at.is_(None),
    )
    count_query = select(func.count(News.id)).where(
        News.status == NewsStatus.published, News.deleted_at.is_(None),
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(News.is_pinned.desc(), News.published_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_public_news_detail(db: AsyncSession, news_id: int) -> News:
    result = await db.execute(
        select(News).options(joinedload(News.category)).where(
            News.id == news_id, News.status == NewsStatus.published, News.deleted_at.is_(None),
        )
    )
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="新闻不存在")
    return news
