from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.utils.crypto import decrypt_value, mask_id_number


class RegistrationCreate(BaseModel):
    contest_id: int
    group_id: int | None = None
    name: str = Field(min_length=2, max_length=20)
    email: str = Field(max_length=255)
    # Optional for logged-in users (backend fetches from account).
    # Required for anonymous public registration.
    id_number: str | None = Field(default=None, min_length=18, max_length=18)
    organization: str | None = Field(default=None, max_length=200)
    custom_fields: dict[str, str] = {}
    privacy_agreed: bool = True


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
        return safe


class RegistrationListOut(BaseModel):
    items: list[RegistrationOut]
    total: int


class ExportRequest(BaseModel):
    export_type: str = Field(pattern="^(registration|result)$")
    contest_id: int
    group_ids: list[int] | None = None
    fields: list[str] = []
