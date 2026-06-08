from datetime import datetime
from pydantic import BaseModel, Field


class ResultCreate(BaseModel):
    contest_id: int
    registration_id: int
    scores: dict[str, float]
    total_score: float | None = None
    rank: int | None = None
    award_id: int | None = None


class ResultUpdate(BaseModel):
    scores: dict[str, float] | None = None
    total_score: float | None = None
    rank: int | None = None
    award_id: int | None = None


class ResultOut(BaseModel):
    id: int
    contest_id: int
    registration_id: int
    scores: dict
    total_score: float
    rank: int | None
    award_id: int | None
    is_published: bool
    created_at: datetime
    updated_at: datetime
    registration_number: str = ""
    contestant_name: str = ""
    group_name: str = ""
    award_name: str = ""
    model_config = {"from_attributes": True}


class ResultListOut(BaseModel):
    items: list[ResultOut]
    total: int


class ResultQueryRequest(BaseModel):
    registration_number: str
    email: str


class ResultQueryOut(BaseModel):
    contest_title: str
    registration_number: str
    name: str
    group_name: str
    scores: dict
    total_score: float
    rank: int | None
    award_name: str
