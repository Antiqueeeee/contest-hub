from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "竞赛信息发布平台"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://contest:contest123@localhost:5432/contest_hub"

    # JWT
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # Export
    export_dir: str = "./exports"
    export_retention_days: int = 7
    export_max_rows: int = 50_000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
