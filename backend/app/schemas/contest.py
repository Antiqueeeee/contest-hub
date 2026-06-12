from datetime import datetime, date, timezone
from pydantic import BaseModel, Field, model_validator, computed_field
from app.utils.timezone import to_aware


class ContestGroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    max_participants: int = 0
    sort_order: int = 0
    template_item_id: int | None = None


class ContestGroupOut(BaseModel):
    id: int
    contest_id: int | None = None
    template_item_id: int | None = None
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
    start_date: date
    end_date: date
    registration_start: datetime
    registration_end: datetime
    max_participants: int = 0
    score_categories: list[str] = ["客观题得分", "主观题得分"]
    groups: list[ContestGroupIn] = []
    awards: list[AwardIn] = []
    fields: list[ContestFieldIn] = []


class ContestUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    cover_image: str | None = None
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    registration_start: datetime | None = None
    registration_end: datetime | None = None
    max_participants: int | None = None
    score_categories: list[str] | None = None
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
    score_categories: list[str] | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    groups: list[ContestGroupOut] = []
    awards: list[AwardOut] = []
    fields: list[ContestFieldOut] = []
    model_config = {"from_attributes": True}

    @computed_field
    @property
    def is_registration_open(self) -> bool:
        """报名通道是否真正开启（status=open 且在当前时间范围内）"""
        if self.status != "open":
            return False
        now = datetime.now(timezone.utc)
        return to_aware(self.registration_start) <= now <= to_aware(self.registration_end)

    @computed_field
    @property
    def is_upcoming(self) -> bool:
        """是否即将开始报名（status=open 但还未到报名开始时间）"""
        if self.status != "open":
            return False
        now = datetime.now(timezone.utc)
        return now < to_aware(self.registration_start)


class ContestListOut(BaseModel):
    items: list[ContestOut]
    total: int
