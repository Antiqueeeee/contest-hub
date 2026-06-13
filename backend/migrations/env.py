import sys
from pathlib import Path
from logging.config import fileConfig
from urllib.parse import quote_plus

from sqlalchemy import create_engine, pool
from alembic import context

# 确保 backend 目录在 sys.path 中，能 import app.*
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base
from app.config import get_settings

# 导入所有模型，确保 Base.metadata 包含全部表
import app.models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# 构建 sync URL（密码需要 URL 编码，和 config.py 一致）
settings = get_settings()
pwd = quote_plus(settings.db_password)
sync_url = f"postgresql://{settings.db_user}:{pwd}@{settings.db_host}:{settings.db_port}/{settings.db_name}"


def run_migrations_offline() -> None:
    context.configure(
        url=sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # 直接用 URL 创建引擎，绕过 ConfigParser 的 % 插值冲突
    connectable = create_engine(sync_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
