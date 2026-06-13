from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=settings.debug)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    # create_all 负责从零建库（无需历史迁移），Alembic 负责增量变更
    # 两者互补，不是技术债 — 除非有完整的初始迁移链，否则不应删除
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
