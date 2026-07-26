"""Request/response schemas for contestant operations."""

from pydantic import BaseModel, Field, field_validator

from app.utils.validators import validate_id_number, validate_password_strength


class ContestantRegister(BaseModel):
    """Data required to register a new contestant account.

    身份证号不在注册时收集（最小必要原则），在首次报名时绑定到账号。
    """
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=64)
    name: str = Field(min_length=2, max_length=20)
    organization: str | None = Field(default=None, max_length=200)
    # 明示同意：必填且必须为 true，由用户主动勾选后前端显式提交。
    privacy_agreed: bool

    _password_strength = field_validator("password")(validate_password_strength)

    @field_validator("privacy_agreed")
    @classmethod
    def must_agree_privacy(cls, v: bool) -> bool:
        if not v:
            raise ValueError("请先阅读并同意《隐私政策》")
        return v


class ContestantLogin(BaseModel):
    """Credentials for contestant login."""
    email: str
    password: str


class ContestantProfileUpdate(BaseModel):
    """Fields that can be updated on a contestant profile."""
    name: str | None = None
    email: str | None = None
    organization: str | None = None
    id_number: str | None = None

    _id_number_valid = field_validator("id_number")(
        lambda v: validate_id_number(v) if v is not None else v
    )
