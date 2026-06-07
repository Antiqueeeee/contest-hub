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
    return {"items": items}


@router.get("/contestant/results")
async def my_results(current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    items = await contestant_service.get_my_results(db, current["contestant_id"])
    return {"items": items}


@router.get("/contestant/results/{contest_id}")
async def my_contest_result(contest_id: int, current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    """Get the logged-in contestant's result for a specific contest."""
    from app.models.registration import Registration
    from app.models.result import Result
    from app.models.contest import Contest, Award

    # Find registration for this contestant + contest
    r = await db.execute(
        select(Registration).where(
            Registration.contestant_id == current["contestant_id"],
            Registration.contest_id == contest_id,
            Registration.deleted_at.is_(None),
        )
    )
    reg = r.scalar_one_or_none()
    if not reg:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="未找到您在该赛事的报名记录")

    # Find published result
    rr = await db.execute(
        select(Result).where(Result.registration_id == reg.id, Result.is_published == True)
    )
    result = rr.scalar_one_or_none()
    if not result:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="成绩尚未发布")

    # Get contest title
    ct = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = ct.scalar_one_or_none()

    award_name = ""
    if result.award_id:
        a = await db.execute(select(Award).where(Award.id == result.award_id))
        award = a.scalar_one_or_none()
        if award:
            award_name = award.name

    return {
        "contest_title": contest.title if contest else "",
        "registration_number": reg.registration_number,
        "name": reg.form_data.get("name", ""),
        "scores": result.scores,
        "total_score": float(result.total_score),
        "rank": result.rank,
        "award_name": award_name,
    }
