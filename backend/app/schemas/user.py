from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.utils.crypto import mask_phone


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=6, max_length=20)
    name: str = Field(min_length=1, max_length=50)
    phone: str = Field(default="", max_length=20)


class UserUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    phone: str | None = Field(None, max_length=20)


class UserOut(BaseModel):
    id: int
    username: str
    name: str
    phone: str
    status: str
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("phone", mode="before")
    @classmethod
    def mask_phone_field(cls, v: str) -> str:
        """Auto-mask phone numbers in all API responses."""
        return mask_phone(v) if v else v
