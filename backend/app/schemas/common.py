from pydantic import BaseModel
from typing import Any


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int


class MessageResponse(BaseModel):
    message: str
