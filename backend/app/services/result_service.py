from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from fastapi import HTTPException, status

from app.models.contest import Contest, ContestGroup, Award, ContestStatus
from app.models.registration import Registration
from app.models.result import Result
from app.schemas.result import ResultCreate, ResultUpdate


async def list_results(
    db: AsyncSession, contest_id: int | None = None, group_id: int | None = None,
    is_published: bool | None = None, keyword: str = "", page: int = 1, page_size: int = 20,
) -> tuple[list[Result], int]:
    query = select(Result).options(joinedload(Result.registration))
    count_query = select(func.count(Result.id))

    if contest_id:
        query = query.where(Result.contest_id == contest_id)
        count_query = count_query.where(Result.contest_id == contest_id)
    if is_published is not None:
        query = query.where(Result.is_published == is_published)
        count_query = count_query.where(Result.is_published == is_published)
    if keyword:
        query = query.join(Result.registration).where(Registration.registration_number.ilike(f"%{keyword}%"))
        count_query = count_query.join(Result.registration).where(Registration.registration_number.ilike(f"%{keyword}%"))
    if group_id:
        query = query.join(Result.registration).where(Registration.group_id == group_id)
        count_query = count_query.join(Result.registration).where(Registration.group_id == group_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Result.total_score.desc().nullslast())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.unique().scalars().all()), total


async def get_result(db: AsyncSession, result_id: int) -> Result:
    result = await db.execute(select(Result).options(joinedload(Result.registration)).where(Result.id == result_id))
    r = result.unique().scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="成绩记录不存在")
    return r


async def create_or_update_result(db: AsyncSession, data: ResultCreate) -> Result:
    # Validate contest is finished
    contest_result = await db.execute(select(Contest).where(Contest.id == data.contest_id))
    contest = contest_result.scalar_one_or_none()
    if not contest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="赛事不存在")
    if contest.status != ContestStatus.finished:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只能为已结束的赛事录入成绩")

    # Validate registration exists
    reg_result = await db.execute(select(Registration).where(Registration.id == data.registration_id, Registration.deleted_at.is_(None)))
    reg = reg_result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报名记录不存在")

    # Check existing or create new
    exist_result = await db.execute(select(Result).where(Result.registration_id == data.registration_id))
    existing = exist_result.scalar_one_or_none()

    total_score = data.total_score or sum(data.scores.values())
    if existing:
        existing.scores = data.scores
        existing.total_score = total_score
        existing.rank = data.rank
        existing.award_id = data.award_id
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        r = Result(
            contest_id=data.contest_id,
            registration_id=data.registration_id,
            scores=data.scores,
            total_score=total_score,
            rank=data.rank,
            award_id=data.award_id,
        )
        db.add(r)
        await db.commit()
        await db.refresh(r)
        return r


async def publish_result(db: AsyncSession, result_id: int) -> Result:
    result = await db.execute(select(Result).where(Result.id == result_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="成绩记录不存在")
    r.is_published = True
    await db.commit()
    await db.refresh(r)
    return r


async def withdraw_result(db: AsyncSession, result_id: int) -> Result:
    result = await db.execute(select(Result).where(Result.id == result_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="成绩记录不存在")
    r.is_published = False
    await db.commit()
    await db.refresh(r)
    return r


async def query_result_public(db: AsyncSession, contest_id: int, registration_number: str, phone: str) -> dict | None:
    if not registration_number.strip() or not phone.strip():
        return None

    reg_result = await db.execute(
        select(Registration).where(
            Registration.contest_id == contest_id,
            Registration.registration_number == registration_number.strip(),
            Registration.deleted_at.is_(None),
        )
    )
    reg = reg_result.scalar_one_or_none()
    if not reg:
        return None
    if reg.form_data.get("phone") != phone.strip():
        return None

    result_result = await db.execute(
        select(Result).where(Result.registration_id == reg.id, Result.is_published == True)
    )
    r = result_result.scalar_one_or_none()
    if not r:
        return None

    group_name = ""
    if reg.group_id:
        g = await db.execute(select(ContestGroup).where(ContestGroup.id == reg.group_id))
        group = g.scalar_one_or_none()
        if group:
            group_name = group.name

    award_name = ""
    if r.award_id:
        a = await db.execute(select(Award).where(Award.id == r.award_id))
        award = a.scalar_one_or_none()
        if award:
            award_name = award.name

    contest_title_result = await db.execute(select(Contest).where(Contest.id == contest_id))
    ct = contest_title_result.scalar_one_or_none()

    return {
        "contest_title": ct.title if ct else "",
        "registration_number": reg.registration_number,
        "name": reg.form_data.get("name", ""),
        "group_name": group_name,
        "scores": r.scores,
        "total_score": r.total_score,
        "rank": r.rank,
        "award_name": award_name,
    }


def _enrich_result_out(r: Result) -> dict:
    reg_number = r.registration.registration_number if r.registration else ""
    name = r.registration.form_data.get("name", "") if r.registration else ""
    return {
        "id": r.id, "contest_id": r.contest_id, "registration_id": r.registration_id,
        "scores": r.scores, "total_score": r.total_score, "rank": r.rank,
        "award_id": r.award_id, "is_published": r.is_published,
        "created_at": r.created_at, "updated_at": r.updated_at,
        "registration_number": reg_number, "contestant_name": name,
    }
