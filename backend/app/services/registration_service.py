from datetime import datetime, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.contest import Contest, ContestGroup, ContestStatus
from app.models.registration import Registration
from app.schemas.registration import RegistrationCreate
from app.utils.timezone import to_aware


def _gen_registration_number(contest_id: int, seq: int) -> str:
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y%m%d")
    return f"C{contest_id:03d}-{date_str}-{seq:04d}"


async def register(db: AsyncSession, data: RegistrationCreate, contestant_id: int | None = None) -> Registration:
    # Validate contest is open
    result = await db.execute(select(Contest).where(Contest.id == data.contest_id))
    contest = result.scalar_one_or_none()
    if not contest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="赛事不存在")
    if contest.status != ContestStatus.open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该赛事当前不可报名")

    now = datetime.now(timezone.utc)

    # Check registration window
    reg_start = to_aware(contest.registration_start)
    if now < reg_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="报名尚未开始")

    reg_end = to_aware(contest.registration_end)
    if now > reg_end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="报名已截止")

    # Check group and capacity
    if data.group_id:
        grp_result = await db.execute(select(ContestGroup).where(ContestGroup.id == data.group_id))
        group = grp_result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="组别不存在")

        count_result = await db.execute(
            select(func.count(Registration.id)).where(
                and_(Registration.contest_id == data.contest_id, Registration.group_id == data.group_id, Registration.deleted_at.is_(None))
            )
        )
        if group.max_participants > 0 and count_result.scalar() >= group.max_participants:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该组别名额已满")

    # Check duplicate id_number+contest+group
    dup = await db.execute(
        select(Registration).where(
            and_(
                Registration.contest_id == data.contest_id,
                Registration.group_id == data.group_id,
                Registration.deleted_at.is_(None),
                Registration.form_data["id_number"].as_string() == data.id_number,
            )
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该身份证号已在此赛事此组别报名")

    # Generate registration number
    count_r = await db.execute(select(func.count(Registration.id)).where(Registration.contest_id == data.contest_id))
    seq = (count_r.scalar() or 0) + 1

    # Build form_data
    form_data = {"name": data.name, "email": data.email, "id_number": data.id_number}
    if data.organization:
        form_data["organization"] = data.organization
    form_data.update(data.custom_fields)

    reg = Registration(
        contest_id=data.contest_id,
        contestant_id=contestant_id,
        group_id=data.group_id,
        registration_number=_gen_registration_number(data.contest_id, seq),
        form_data=form_data,
    )
    db.add(reg)
    await db.commit()
    await db.refresh(reg)
    return reg


async def list_registrations(
    db: AsyncSession, contest_id: int | None = None, group_id: int | None = None,
    keyword: str = "", page: int = 1, page_size: int = 20,
) -> tuple[list[Registration], int]:
    query = select(Registration).where(Registration.deleted_at.is_(None))
    count_query = select(func.count(Registration.id)).where(Registration.deleted_at.is_(None))

    if contest_id:
        query = query.where(Registration.contest_id == contest_id)
        count_query = count_query.where(Registration.contest_id == contest_id)
    if group_id:
        query = query.where(Registration.group_id == group_id)
        count_query = count_query.where(Registration.group_id == group_id)
    if keyword:
        query = query.where(Registration.registration_number.ilike(f"%{keyword}%"))
        count_query = count_query.where(Registration.registration_number.ilike(f"%{keyword}%"))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Registration.submitted_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_registration(db: AsyncSession, reg_id: int) -> Registration:
    result = await db.execute(select(Registration).where(Registration.id == reg_id, Registration.deleted_at.is_(None)))
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报名记录不存在")
    return reg


async def soft_delete_registration(db: AsyncSession, reg_id: int):
    result = await db.execute(select(Registration).where(Registration.id == reg_id, Registration.deleted_at.is_(None)))
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报名记录不存在")
    reg.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def get_registrations_for_export(
    db: AsyncSession, contest_id: int, group_ids: list[int] | None = None
) -> list[Registration]:
    query = select(Registration).where(Registration.contest_id == contest_id, Registration.deleted_at.is_(None))
    if group_ids:
        query = query.where(Registration.group_id.in_(group_ids))
    result = await db.execute(query.order_by(Registration.submitted_at))
    return list(result.scalars().all())
