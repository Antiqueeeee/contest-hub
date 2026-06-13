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
    # TODO: 生成完整 initial 迁移后删除 create_all，统一走 Alembic
    # 当前两套并存：create_all 处理新库建表，Alembic 处理老库增量
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
