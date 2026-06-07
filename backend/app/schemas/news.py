from datetime import datetime
from pydantic import BaseModel, Field


class NewsCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    sort_order: int = 0


class NewsCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    sort_order: int | None = None


class NewsCategoryOut(BaseModel):
    id: int
    name: str
    sort_order: int
    created_at: datetime
    model_config = {"from_attributes": True}


class NewsCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category_id: int
    content: str = ""
    cover_image: str = ""
    is_pinned: bool = False


class NewsUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    category_id: int | None = None
    content: str | None = None
    cover_image: str | None = None
    is_pinned: bool | None = None


class NewsOut(BaseModel):
    id: int
    author_id: int
    category_id: int
    title: str
    content: str
    cover_image: str
    is_pinned: bool
    status: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
