from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from fastapi import HTTPException, status

from app.models.contest import Contest, ContestGroup, Award, ContestField, ContestStatus
from app.schemas.contest import ContestCreate, ContestUpdate
from app.utils.timezone import to_aware


def _build_contest_select():
    return (
        select(Contest)
        .options(
            selectinload(Contest.groups),
            selectinload(Contest.awards),
            selectinload(Contest.fields),
        )
    )



def _derive_status(contest: Contest, now: datetime) -> ContestStatus:
    """Compute the time-driven status from dates alone (ignores current status)."""
    tz = contest.timezone
    reg_start = to_aware(contest.registration_start, tz)
    reg_end = to_aware(contest.registration_end, tz)
    end_date = to_aware(contest.end_date, tz)

    if now < reg_start:
        return ContestStatus.draft
    elif now < reg_end:
        return ContestStatus.open
    elif now < end_date:
        return ContestStatus.ongoing
    else:
        return ContestStatus.finished


def _auto_transition(contest: Contest) -> None:
    """Forward-only auto-update based on current time and key dates.
    Only advances time-driven states; never touches cancelled contests."""
    if contest.status == ContestStatus.cancelled:
        return

    now = datetime.now(timezone.utc)
    derived = _derive_status(contest, now)

    # Only move forward — don't revert explicit status changes
    status_order = {
        ContestStatus.draft: 0,
        ContestStatus.open: 1,
        ContestStatus.ongoing: 2,
        ContestStatus.finished: 3,
    }
    if status_order.get(derived, -1) > status_order.get(contest.status, -1):
        contest.status = derived


def _validate_contest_dates(
    start_date: datetime,
    end_date: datetime,
    registration_start: datetime,
    registration_end: datetime,
    timezone: str = "Asia/Shanghai",
) -> None:
    """Validate contest date relationships."""
    sd = to_aware(start_date, timezone)
    ed = to_aware(end_date, timezone)
    rs = to_aware(registration_start, timezone)
    re = to_aware(registration_end, timezone)

    if sd >= ed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="比赛开始日期必须早于结束日期",
        )
    if rs >= re:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="报名开始时间必须早于报名截止时间",
        )
    if re.date() > ed.date():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="报名截止日期不能晚于比赛结束日期",
        )


async def list_contests(
    db: AsyncSession, keyword: str = "", status: str | None = None, page: int = 1, page_size: int = 20
) -> tuple[list[Contest], int]:
    query = _build_contest_select()
    count_query = select(func.count(Contest.id))

    if keyword:
        query = query.where(Contest.title.ilike(f"%{keyword}%"))
        count_query = count_query.where(Contest.title.ilike(f"%{keyword}%"))
    if status:
        query = query.where(Contest.status == status)
        count_query = count_query.where(Contest.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Contest.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    contests = list(result.unique().scalars().all())

    # Auto-transition contests whose registration has ended
    changed = False
    for c in contests:
        old_status = c.status
        _auto_transition(c)
        if c.status != old_status:
            changed = True
    if changed:
        await db.commit()

    return contests, total


async def get_contest(db: AsyncSession, contest_id: int) -> Contest:
    result = await db.execute(_build_contest_select().where(Contest.id == contest_id))
    contest = result.unique().scalar_one_or_none()
    if not contest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="赛事不存在")
    _auto_transition(contest)
    if contest in db.dirty:
        await db.commit()
        await db.refresh(contest)
    return contest


async def create_contest(db: AsyncSession, data: ContestCreate, creator_id: int) -> Contest:
    contest = Contest(
        creator_id=creator_id,
        title=data.title,
        description=data.description,
        cover_image=data.cover_image,
        location=data.location,
        start_date=_parse_date(data.start_date),
        end_date=_parse_date(data.end_date),
        registration_start=_parse_datetime(data.registration_start),
        registration_end=_parse_datetime(data.registration_end),
        max_participants=data.max_participants,
        score_categories=data.score_categories,
        timezone=data.timezone,
    )
    _validate_contest_dates(
        contest.start_date,
        contest.end_date,
        contest.registration_start,
        contest.registration_end,
        contest.timezone,
    )
    # Set initial status based on dates rather than always defaulting to draft
    now = datetime.now(timezone.utc)
    derived = _derive_status(contest, now)
    if derived != contest.status:
        contest.status = derived

    db.add(contest)
    await db.flush()

    for g in data.groups:
        gd = g.model_dump() if hasattr(g, 'model_dump') else g
        db.add(ContestGroup(contest_id=contest.id, **gd))
    for a in data.awards:
        ad = a.model_dump() if hasattr(a, 'model_dump') else a
        db.add(Award(contest_id=contest.id, **ad))
    for f in data.fields:
        fd = f.model_dump() if hasattr(f, 'model_dump') else f
        db.add(ContestField(contest_id=contest.id, **fd))

    await db.commit()
    await db.refresh(contest)
    return await get_contest(db, contest.id)


async def update_contest(db: AsyncSession, contest_id: int, data: ContestUpdate) -> Contest:
    result = await db.execute(_build_contest_select().where(Contest.id == contest_id))
    contest = result.unique().scalar_one_or_none()
    if not contest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="赛事不存在")

    update_data = data.model_dump(exclude_unset=True)

    # Handle date fields
    for date_field in ["start_date", "end_date"]:
        if date_field in update_data and update_data[date_field] is not None:
            update_data[date_field] = _parse_date(update_data[date_field])
    for dt_field in ["registration_start", "registration_end"]:
        if dt_field in update_data and update_data[dt_field] is not None:
            update_data[dt_field] = _parse_datetime(update_data[dt_field])

    # Handle nested fields
    groups_data = update_data.pop("groups", None)
    awards_data = update_data.pop("awards", None)
    fields_data = update_data.pop("fields", None)

    for key, val in update_data.items():
        setattr(contest, key, val)

    # Validate dates after merging updates
    _validate_contest_dates(
        contest.start_date,
        contest.end_date,
        contest.registration_start,
        contest.registration_end,
        contest.timezone,
    )

    # Recompute status from new dates (unless manually cancelled)
    if contest.status != ContestStatus.cancelled:
        now = datetime.now(timezone.utc)
        derived = _derive_status(contest, now)
        if derived != contest.status:
            contest.status = derived

    if groups_data is not None:
        await db.execute(select(ContestGroup).where(ContestGroup.contest_id == contest_id))
        existing = (await db.execute(select(ContestGroup).where(ContestGroup.contest_id == contest_id))).scalars().all()
        for eg in existing:
            await db.delete(eg)
        for g in groups_data:
            gd = g.model_dump() if hasattr(g, 'model_dump') else g
            db.add(ContestGroup(contest_id=contest_id, **gd))

    if awards_data is not None:
        existing = (await db.execute(select(Award).where(Award.contest_id == contest_id))).scalars().all()
        for ea in existing:
            await db.delete(ea)
        for a in awards_data:
            ad = a.model_dump() if hasattr(a, 'model_dump') else a
            db.add(Award(contest_id=contest_id, **ad))

    if fields_data is not None:
        existing = (await db.execute(select(ContestField).where(ContestField.contest_id == contest_id))).scalars().all()
        for ef in existing:
            await db.delete(ef)
        for f in fields_data:
            fd = f.model_dump() if hasattr(f, 'model_dump') else f
            db.add(ContestField(contest_id=contest_id, **fd))

    await db.commit()
    return await get_contest(db, contest_id)


async def update_contest_status(db: AsyncSession, contest_id: int, new_status: str) -> Contest:
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if not contest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="赛事不存在")

    valid_transitions = {
        ContestStatus.draft: [ContestStatus.open],
        ContestStatus.open: [ContestStatus.ongoing, ContestStatus.cancelled],
        ContestStatus.ongoing: [ContestStatus.finished],
        ContestStatus.finished: [ContestStatus.draft],
    }
    target = ContestStatus(new_status)
    if target not in valid_transitions.get(contest.status, []):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"不能从 {contest.status.value} 转换为 {new_status}")

    contest.status = target
    await db.commit()
    await db.refresh(contest)
    return contest


async def copy_contest(db: AsyncSession, contest_id: int, creator_id: int) -> Contest:
    original = await get_contest(db, contest_id)
    new_contest = Contest(
        creator_id=creator_id,
        title=f"{original.title} (副本)",
        description=original.description,
        cover_image=original.cover_image,
        location=original.location,
        start_date=original.start_date,
        end_date=original.end_date,
        registration_start=original.registration_start,
        registration_end=original.registration_end,
        max_participants=original.max_participants,
        score_categories=original.score_categories,
        timezone=original.timezone,
    )
    db.add(new_contest)
    await db.flush()

    for g in original.groups:
        db.add(ContestGroup(contest_id=new_contest.id, name=g.name, description=g.description, max_participants=g.max_participants, sort_order=g.sort_order))
    for a in original.awards:
        db.add(Award(contest_id=new_contest.id, name=a.name, description=a.description, sort_order=a.sort_order))
    for f in original.fields:
        db.add(ContestField(contest_id=new_contest.id, field_name=f.field_name, field_type=f.field_type, is_required=f.is_required, options=f.options, sort_order=f.sort_order))

    await db.commit()
    return await get_contest(db, new_contest.id)


async def delete_contest(db: AsyncSession, contest_id: int):
    contest = await get_contest(db, contest_id)
    await db.delete(contest)
    await db.commit()


# --- Helpers ---

def _parse_date(v: datetime | str | None) -> datetime | None:
    if isinstance(v, datetime):
        return v
    if not v:
        return None
    return datetime.strptime(str(v)[:10], "%Y-%m-%d")


def _parse_datetime(v: datetime | str | None) -> datetime | None:
    if isinstance(v, datetime):
        return v
    if not v:
        return None
    s = str(v).replace("T", " ")
    try:
        return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return datetime.strptime(s[:16], "%Y-%m-%d %H:%M")
