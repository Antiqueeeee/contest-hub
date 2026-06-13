from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from fastapi import HTTPException, status

from app.models.contest import Contest, ContestGroup, Award, ContestStatus
from app.models.registration import Registration
from app.models.result import Result
from app.schemas.result import ResultCreate, ResultUpdate, ResultFilter


async def list_results(
    db: AsyncSession, filters: ResultFilter,
) -> tuple[list[Result], int]:
    """List results with filtering and pagination.

    Args:
        db: Database session.
        filters: Query filters (contest_id, group_id, is_published, keyword, page, page_size).

    Returns:
        A tuple of (result_items, total_count).
    """
    query = select(Result).options(joinedload(Result.registration))
    count_query = select(func.count(Result.id))

    if filters.contest_id:
        query = query.where(Result.contest_id == filters.contest_id)
        count_query = count_query.where(Result.contest_id == filters.contest_id)
    if filters.is_published is not None:
        query = query.where(Result.is_published == filters.is_published)
        count_query = count_query.where(Result.is_published == filters.is_published)
    if filters.keyword:
        query = query.join(Result.registration).where(Registration.registration_number.ilike(f"%{filters.keyword}%"))
        count_query = count_query.join(Result.registration).where(Registration.registration_number.ilike(f"%{filters.keyword}%"))
    if filters.group_id:
        query = query.join(Result.registration).where(Registration.group_id == filters.group_id)
        count_query = count_query.join(Result.registration).where(Registration.group_id == filters.group_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Result.total_score.desc().nullslast())
    query = query.offset((filters.page - 1) * filters.page_size).limit(filters.page_size)
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


# ── Shared helpers ───────────────────────────────────────────────


async def lookup_award_name(db: AsyncSession, award_id: int | None) -> str:
    """Resolve an award_id to its display name. Returns '' if no award is found."""
    if not award_id:
        return ""
    a = await db.execute(select(Award).where(Award.id == award_id))
    award = a.scalar_one_or_none()
    return award.name if award else ""


async def lookup_group_name(db: AsyncSession, group_id: int | None) -> str:
    """Resolve a group_id to its display name. Returns '' if no group is found."""
    if not group_id:
        return ""
    g = await db.execute(select(ContestGroup).where(ContestGroup.id == group_id))
    group = g.scalar_one_or_none()
    return group.name if group else ""


# ── Public query ─────────────────────────────────────────────────


async def query_result_public(db: AsyncSession, contest_id: int, registration_number: str, email: str) -> dict | None:
    """Look up a published result by contest, registration number, and email.

    Returns None when no match is found (invalid query or result not published).
    """
    if not registration_number.strip() or not email.strip():
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
    if reg.form_data.get("email") != email.strip():
        return None

    result_result = await db.execute(
        select(Result).where(Result.registration_id == reg.id, Result.is_published == True)
    )
    r = result_result.scalar_one_or_none()
    if not r:
        return None

    group_name = await lookup_group_name(db, reg.group_id)
    award_name = await lookup_award_name(db, r.award_id)

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
    """Build a dict representation of a Result including derived registration fields."""
    reg_number = r.registration.registration_number if r.registration else ""
    name = r.registration.form_data.get("name", "") if r.registration else ""
    return {
        "id": r.id, "contest_id": r.contest_id, "registration_id": r.registration_id,
        "scores": r.scores, "total_score": r.total_score, "rank": r.rank,
        "award_id": r.award_id, "is_published": r.is_published,
        "created_at": r.created_at, "updated_at": r.updated_at,
        "registration_number": reg_number, "contestant_name": name,
    }
