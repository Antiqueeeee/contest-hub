from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.contestant_auth import get_current_contestant
from app.schemas.contestant import ContestantRegister, ContestantLogin, ContestantProfileUpdate
from app.services import contestant_service
from app.utils.crypto import mask_id_number

router = APIRouter(prefix="/api", tags=["选手"])


@router.post("/auth/contestant/register")
async def register(data: ContestantRegister, db: AsyncSession = Depends(get_db)):
    return await contestant_service.register_contestant(db, data)


@router.post("/auth/contestant/login")
async def login(data: ContestantLogin, db: AsyncSession = Depends(get_db)):
    return await contestant_service.login_contestant(db, data.email, data.password)


@router.get("/contestant/profile")
async def get_profile(current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    c = await contestant_service.get_contestant_profile(db, current["contestant_id"])
    return {"id": c.id, "name": c.name, "email": c.email,
            "id_number": mask_id_number(c.id_number), "organization": c.organization}


@router.put("/contestant/profile")
async def update_profile(data: ContestantProfileUpdate, current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    c = await contestant_service.update_contestant_profile(db, current["contestant_id"], data)
    return {"id": c.id, "name": c.name, "email": c.email,
            "id_number": mask_id_number(c.id_number), "organization": c.organization}


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
    from sqlalchemy import select
    from app.models.registration import Registration
    from app.models.result import Result
    from app.models.contest import Contest
    from app.services.result_service import lookup_award_name

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
        raise HTTPException(status_code=404, detail="未找到您在该赛事的报名记录")

    # Find published result
    rr = await db.execute(
        select(Result).where(Result.registration_id == reg.id, Result.is_published == True)
    )
    result = rr.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="成绩尚未发布")

    # Get contest title
    ct = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = ct.scalar_one_or_none()

    award_name = await lookup_award_name(db, result.award_id)

    return {
        "contest_title": contest.title if contest else "",
        "registration_number": reg.registration_number,
        "name": reg.form_data.get("name", ""),
        "scores": result.scores,
        "total_score": float(result.total_score),
        "rank": result.rank,
        "award_name": award_name,
    }
