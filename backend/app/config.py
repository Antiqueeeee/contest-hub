from pydantic_settings import BaseSettings
from functools import lru_cache
from urllib.parse import quote_plus


class Settings(BaseSettings):
    app_name: str = "竞赛信息发布平台"
    debug: bool = True

    # Database (URL-encode password so special chars like @#! won't break parsing)
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "contest"
    db_password: str = "contest123"
    db_name: str = "contest_hub"

    @property
    def database_url(self) -> str:
        pwd = quote_plus(self.db_password)
        return f"postgresql+asyncpg://{self.db_user}:{pwd}@{self.db_host}:{self.db_port}/{self.db_name}"

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
