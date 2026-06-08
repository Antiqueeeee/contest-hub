from datetime import datetime
from pydantic import BaseModel, Field


class RegistrationCreate(BaseModel):
    contest_id: int
    group_id: int | None = None
    name: str = Field(min_length=2, max_length=20)
    email: str = Field(max_length=255)
    id_number: str = Field(min_length=18, max_length=18)
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


class RegistrationListOut(BaseModel):
    items: list[RegistrationOut]
    total: int


class ExportRequest(BaseModel):
    export_type: str = Field(pattern="^(registration|result)$")
    contest_id: int
    group_ids: list[int] | None = None
    fields: list[str] = []
