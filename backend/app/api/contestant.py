from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.contestant_auth import get_current_contestant
from app.services import contestant_service

router = APIRouter(prefix="/api", tags=["选手"])


class ContestantRegister(BaseModel):
    phone: str = Field(pattern=r"^1\d{10}$")
    password: str = Field(min_length=6, max_length=20)
    name: str = Field(min_length=2, max_length=20)


class ContestantLogin(BaseModel):
    phone: str
    password: str


class ContestantProfileUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None


@router.post("/auth/contestant/register")
async def register(data: ContestantRegister, db: AsyncSession = Depends(get_db)):
    return await contestant_service.register_contestant(db, data.phone, data.password, data.name)


@router.post("/auth/contestant/login")
async def login(data: ContestantLogin, db: AsyncSession = Depends(get_db)):
    return await contestant_service.login_contestant(db, data.phone, data.password)


@router.get("/contestant/profile")
async def get_profile(current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    c = await contestant_service.get_contestant_profile(db, current["contestant_id"])
    return {"id": c.id, "name": c.name, "phone": c.phone}


@router.put("/contestant/profile")
async def update_profile(data: ContestantProfileUpdate, current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    c = await contestant_service.update_contestant_profile(db, current["contestant_id"], data.name, data.phone)
    return {"id": c.id, "name": c.name, "phone": c.phone}


@router.get("/contestant/registrations")
async def my_registrations(current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    items = await contestant_service.get_my_registrations(db, current["contestant_id"])
    return {"items": [{"id": r.id, "registration_number": r.registration_number, "form_data": r.form_data, "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None} for r in items]}


@router.get("/contestant/results")
async def my_results(current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    items = await contestant_service.get_my_results(db, current["contestant_id"])
    return {"items": items}
