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
    db_password: str = ""          # REQUIRED — set via .env or environment variable
    db_name: str = "contest_hub"

    @property
    def database_url(self) -> str:
        if not self.db_password:
            raise ValueError("db_password 未配置，请在 .env 文件或环境变量中设置")
        pwd = quote_plus(self.db_password)
        return f"postgresql+asyncpg://{self.db_user}:{pwd}@{self.db_host}:{self.db_port}/{self.db_name}"

    # JWT
    jwt_secret: str = ""           # REQUIRED — set via .env or environment variable
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120

    # Encryption key for PII fields (id_number, phone).
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    encryption_key: str = ""       # REQUIRED

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # Upload
    upload_dir: str = "./uploads"
    upload_max_size_mb: int = 10

    # Export
    export_dir: str = "./exports"
    export_retention_days: int = 7
    export_max_rows: int = 50_000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    # Validate required secrets at startup so misconfiguration fails fast
    if not settings.jwt_secret:
        raise ValueError("jwt_secret 未配置，请在 .env 文件或环境变量中设置")
    if not settings.encryption_key:
        raise ValueError("encryption_key 未配置，请运行以下命令生成:\n"
                         "  python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
    return settings
