from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.utils.crypto import decrypt_value, mask_id_number
from app.utils.minor import mask_birth_date, mask_name, mask_contact
from app.utils.validators import validate_id_number


class RegistrationCreate(BaseModel):
    contest_id: int
    group_id: int | None = None
    name: str = Field(min_length=2, max_length=20)
    email: str = Field(max_length=255)
    # Optional for logged-in users whose account already has an id_number bound
    # (backend uses the account value).  Required for anonymous registration
    # and for first-time registration from a logged-in account without one.
    id_number: str | None = Field(default=None, min_length=18, max_length=18)
    organization: str | None = Field(default=None, max_length=200)
    custom_fields: dict[str, str] = {}
    # 明示同意：必填且必须为 true，前端默认不勾选、由用户主动勾选。
    privacy_agreed: bool
    # 敏感个人信息（身份证号）单独同意，仅在实际提交身份证号时要求。
    id_number_agreed: bool = False
    # ── 未成年人保护模块（可选启用）────────────────────────────
    # 仅当系统开关开启且赛事声明面向未成年人时，以下字段按年龄分支必填；
    # 否则全部可空、不参与任何校验，普通流程不受影响。
    birth_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="出生日期 YYYY-MM-DD")
    guardian_name: str | None = Field(default=None, max_length=100)
    guardian_contact: str | None = Field(default=None, max_length=200)
    # 14 岁以下选手：监护人同意（单独同意，独立于隐私政策与身份证号同意）
    guardian_agreed: bool = False
    # 14-18 岁选手：本人「已满 14 周岁」声明
    minor_statement_agreed: bool = False

    @field_validator("id_number")
    @classmethod
    def id_number_checksum(cls, v: str | None) -> str | None:
        return validate_id_number(v) if v is not None else v

    @field_validator("privacy_agreed")
    @classmethod
    def must_agree_privacy(cls, v: bool) -> bool:
        if not v:
            raise ValueError("请先阅读并同意《隐私政策》")
        return v


class RegistrationOut(BaseModel):
    id: int
    contest_id: int
    group_id: int | None
    registration_number: str
    form_data: dict
    submitted_at: datetime
    model_config = {"from_attributes": True}

    @field_validator("form_data", mode="before")
    @classmethod
    def mask_form_data_pii(cls, v: dict) -> dict:
        """Mask sensitive fields inside form_data before serializing to the client."""
        if not v:
            return v
        safe = dict(v)
        if "id_number" in safe and safe["id_number"]:
            try:
                plain = decrypt_value(safe["id_number"])
            except Exception:
                plain = ""
            safe["id_number"] = mask_id_number(plain) if plain else ""
        # 未成年人保护模块：匿名报名表单中的出生日期/监护人信息（加密存储）
        for key, masker in (
            ("birth_date", mask_birth_date),
            ("guardian_name", mask_name),
            ("guardian_contact", mask_contact),
        ):
            if safe.get(key):
                try:
                    safe[key] = masker(decrypt_value(safe[key]))
                except Exception:
                    safe[key] = ""
        return safe


class RegistrationListOut(BaseModel):
    items: list[RegistrationOut]
    total: int


class ExportRequest(BaseModel):
    export_type: str = Field(pattern="^(registration|result)$")
    contest_id: int
    group_ids: list[int] | None = None
    fields: list[str] = []
