from datetime import datetime, date
from pydantic import BaseModel, Field, model_validator


class ContestGroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    max_participants: int = 0
    sort_order: int = 0


class ContestGroupOut(BaseModel):
    id: int
    contest_id: int
    name: str
    description: str
    max_participants: int
    sort_order: int
    model_config = {"from_attributes": True}


class AwardIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    sort_order: int = 0


class AwardOut(BaseModel):
    id: int
    contest_id: int
    name: str
    description: str
    sort_order: int
    model_config = {"from_attributes": True}


class ContestFieldIn(BaseModel):
    field_name: str = Field(min_length=1, max_length=50)
    field_type: str = "text"  # text, number, select, date, textarea
    is_required: bool = False
    options: list[str] | None = None
    sort_order: int = 0


class ContestFieldOut(BaseModel):
    id: int
    contest_id: int
    field_name: str
    field_type: str
    is_required: bool
    options: list | None
    sort_order: int
    model_config = {"from_attributes": True}


class ContestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    cover_image: str = ""
    location: str = ""
    start_date: date | str
    end_date: date | str
    registration_start: datetime | str
    registration_end: datetime | str
    max_participants: int = 0
    groups: list[ContestGroupIn] = []
    awards: list[AwardIn] = []
    fields: list[ContestFieldIn] = []


class ContestUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    cover_image: str | None = None
    location: str | None = None
    start_date: date | str | None = None
    end_date: date | str | None = None
    registration_start: datetime | str | None = None
    registration_end: datetime | str | None = None
    max_participants: int | None = None
    groups: list[ContestGroupIn] | None = None
    awards: list[AwardIn] | None = None
    fields: list[ContestFieldIn] | None = None


class ContestOut(BaseModel):
    id: int
    creator_id: int
    title: str
    description: str
    cover_image: str
    location: str
    start_date: datetime
    end_date: datetime
    registration_start: datetime
    registration_end: datetime
    max_participants: int
    status: str
    created_at: datetime
    updated_at: datetime
    groups: list[ContestGroupOut] = []
    awards: list[AwardOut] = []
    fields: list[ContestFieldOut] = []
    model_config = {"from_attributes": True}


class ContestListOut(BaseModel):
    items: list[ContestOut]
    total: int
