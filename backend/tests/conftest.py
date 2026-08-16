"""Pytest fixtures for backend compliance tests.

需要一个一次性的 PostgreSQL 测试库（不会触碰开发/生产库）：

    docker run -d --name contest-test-pg \
      -e POSTGRES_USER=contest -e POSTGRES_PASSWORD=test123 \
      -e POSTGRES_DB=contest_hub_test -p 55433:5432 postgres:17-alpine

然后： cd backend && pytest

注意：fixture 每个用例执行 drop_all/create_all 且共享同一测试库，
不支持 pytest -n 并行。

环境变量 DB_* 会覆盖 .env，本文件为它们提供指向测试库的默认值。
安全保护：DB_NAME 不含 "test" 时拒绝运行，防止误清真实数据库。
"""

import os
import tempfile

os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "55433")
os.environ.setdefault("DB_USER", "contest")
os.environ.setdefault("DB_PASSWORD", "test123")
os.environ.setdefault("DB_NAME", "contest_hub_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-2026")
os.environ.setdefault("EXPORT_DIR", tempfile.mkdtemp(prefix="contest-test-exports-"))
os.environ.setdefault("UPLOAD_DIR", tempfile.mkdtemp(prefix="contest-test-uploads-"))

from cryptography.fernet import Fernet  # noqa: E402

os.environ.setdefault("ENCRYPTION_KEY", Fernet.generate_key().decode())

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

if "test" not in os.environ["DB_NAME"]:
    raise RuntimeError(f"测试数据库名必须包含 'test'，当前: {os.environ['DB_NAME']}")

from app.config import get_settings  # noqa: E402
from app.database import Base
import app.models  # noqa: E402,F401 — 注册全部表


@pytest.fixture()
async def db():
    """每个测试独立的建表/清表周期（共享同一测试数据库，禁止指向真实库）。"""
    eng = create_async_engine(get_settings().database_url)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(eng, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await eng.dispose()


@pytest.fixture()
async def contest(db):
    """一场处于报名窗口内的开放赛事。"""
    from datetime import datetime, timedelta
    from app.models.contest import Contest, ContestStatus
    from app.models.user import User
    from app.services.auth_service import hash_password

    admin = User(username="admin", password_hash=hash_password("Admin123"), name="管理员", phone="")
    db.add(admin)
    await db.flush()
    now = datetime.now()
    c = Contest(
        creator_id=admin.id, title="测试赛事",
        start_date=now, end_date=now + timedelta(days=30),
        registration_start=now - timedelta(days=1),
        registration_end=now + timedelta(days=10),
        status=ContestStatus.open, timezone="UTC",
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


VALID_ID_A = "110101199003077758"
VALID_ID_B = "320102199505124329"


def make_id_number(birth_date: str, seq: int = 1) -> str:
    """Generate a valid-checksum 18-digit ID whose embedded birth date matches.

    后端新增出生日期与身份证号交叉校验后，未成年人测试数据必须一致。
    """
    weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    codes = "10X98765432"
    id17 = f"110101{birth_date.replace('-', '')}{seq:03d}"
    total = sum(int(d) * w for d, w in zip(id17, weights))
    return id17 + codes[total % 11]
