from datetime import datetime, timedelta, timezone
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.config import get_settings
from app.models.contestant import Contestant
from app.models.registration import Registration
from app.models.result import Result
from app.services.auth_service import hash_password, verify_password


def create_contestant_token(contestant_id: int, phone: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(contestant_id), "phone": phone, "type": "contestant", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def register_contestant(db: AsyncSession, phone: str, password: str, name: str) -> dict:
    existing = await db.execute(select(Contestant).where(Contestant.phone == phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该手机号已注册")
    c = Contestant(phone=phone, password_hash=hash_password(password), name=name)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    token = create_contestant_token(c.id, c.phone)
    return {"access_token": token, "user": {"id": c.id, "name": c.name, "phone": c.phone}}


async def login_contestant(db: AsyncSession, phone: str, password: str) -> dict:
    result = await db.execute(select(Contestant).where(Contestant.phone == phone))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="手机号未注册")
    if not verify_password(password, c.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="密码错误")
    token = create_contestant_token(c.id, c.phone)
    return {"access_token": token, "user": {"id": c.id, "name": c.name, "phone": c.phone}}


async def get_contestant_profile(db: AsyncSession, contestant_id: int) -> Contestant:
    result = await db.execute(select(Contestant).where(Contestant.id == contestant_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="选手不存在")
    return c


async def update_contestant_profile(db: AsyncSession, contestant_id: int, name: str | None, phone: str | None) -> Contestant:
    c = await get_contestant_profile(db, contestant_id)
    if name is not None:
        c.name = name
    if phone is not None and phone != c.phone:
        # Check uniqueness
        existing = await db.execute(select(Contestant).where(Contestant.phone == phone))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该手机号已被使用")
        c.phone = phone
    await db.commit()
    await db.refresh(c)
    return c


async def get_my_registrations(db: AsyncSession, contestant_id: int) -> list[dict]:
    from app.models.contest import Contest, ContestStatus
    result = await db.execute(
        select(Registration).where(Registration.contestant_id == contestant_id, Registration.deleted_at.is_(None))
        .order_by(Registration.submitted_at.desc())
    )
    regs = list(result.scalars().all())
    output = []
    for reg in regs:
        ct = await db.execute(select(Contest).where(Contest.id == reg.contest_id))
        contest = ct.scalar_one_or_none()

        # Check for result
        rr = await db.execute(select(Result).where(Result.registration_id == reg.id, Result.is_published == True))
        result_row = rr.scalar_one_or_none()

        status_labels = {
            ContestStatus.open: "报名中",
            ContestStatus.ongoing: "进行中",
            ContestStatus.finished: "已结束",
            ContestStatus.draft: "未发布",
            ContestStatus.cancelled: "已取消",
        }

        item = {
            "id": reg.id,
            "registration_number": reg.registration_number,
            "contest_id": reg.contest_id,
            "contest_title": contest.title if contest else "未知赛事",
            "contest_status": contest.status.value if contest else "unknown",
            "contest_status_label": status_labels.get(contest.status, contest.status.value) if contest else "未知",
            "form_data": reg.form_data,
            "submitted_at": reg.submitted_at.isoformat() if reg.submitted_at else None,
        }

        if result_row:
            award_name = ""
            if result_row.award_id:
                from app.models.contest import Award
                a = await db.execute(select(Award).where(Award.id == result_row.award_id))
                award = a.scalar_one_or_none()
                if award: award_name = award.name
            item["result"] = {
                "total_score": float(result_row.total_score),
                "rank": result_row.rank,
                "award_name": award_name,
                "scores": result_row.scores,
            }
        else:
            item["result"] = None

        output.append(item)
    return output


async def get_my_results(db: AsyncSession, contestant_id: int) -> list[dict]:
    from app.models.contest import Award
    reg_data = await get_my_registrations(db, contestant_id)
    # reg_data is list[dict] with contest_title etc
    results_list = []
    for reg_dict in reg_data:
        r = await db.execute(select(Result).where(Result.registration_id == reg_dict["id"], Result.is_published == True))
        result = r.scalar_one_or_none()
        if result:
            award_name = ""
            if result.award_id:
                a = await db.execute(select(Award).where(Award.id == result.award_id))
                award = a.scalar_one_or_none()
                if award:
                    award_name = award.name
            results_list.append({
                "id": result.id,
                "registration_number": reg_dict["registration_number"],
                "contest_title": reg_dict["contest_title"],
                "total_score": float(result.total_score),
                "rank": result.rank,
                "award_name": award_name,
                "scores": result.scores,
            })
    return results_list
