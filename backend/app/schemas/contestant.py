"""Request/response schemas for contestant operations."""

from pydantic import BaseModel, Field


class ContestantRegister(BaseModel):
    """Data required to register a new contestant account."""
    email: str = Field(max_length=255)
    password: str = Field(min_length=6, max_length=20)
    name: str = Field(min_length=2, max_length=20)
    id_number: str = Field(min_length=18, max_length=18)
    organization: str | None = Field(default=None, max_length=200)


class ContestantLogin(BaseModel):
    """Credentials for contestant login."""
    email: str
    password: str


class ContestantProfileUpdate(BaseModel):
    """Fields that can be updated on a contestant profile."""
    name: str | None = None
    email: str | None = None
    organization: str | None = None
