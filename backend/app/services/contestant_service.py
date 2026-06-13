from datetime import datetime, timedelta, timezone
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.config import get_settings
from app.models.contestant import Contestant
from app.models.registration import Registration
from app.models.result import Result
from app.schemas.contestant import ContestantRegister, ContestantProfileUpdate
from app.services.auth_service import hash_password, verify_password
from app.services.result_service import lookup_award_name
from app.utils.crypto import mask_id_number, mask_email


# ── Token ────────────────────────────────────────────────────────


def create_contestant_token(contestant_id: int) -> str:
    """Issue a signed JWT for the given contestant.  No PII in the payload."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(contestant_id), "type": "contestant", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _build_auth_response(contestant: Contestant) -> dict:
    """Build the standard login/register response dict with masked PII."""
    token = create_contestant_token(contestant.id)
    return {
        "access_token": token,
        "user": {
            "id": contestant.id,
            "name": contestant.name,
            "email": contestant.email,
            "id_number": mask_id_number(contestant.id_number),
            "organization": contestant.organization,
        },
    }


# ── Auth operations ──────────────────────────────────────────────


async def register_contestant(db: AsyncSession, data: ContestantRegister) -> dict:
    """Create a new contestant account and return an auth token."""
    existing = await db.execute(select(Contestant).where(Contestant.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已注册")

    c = Contestant(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        id_number=data.id_number,
        organization=data.organization,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _build_auth_response(c)


async def login_contestant(db: AsyncSession, email: str, password: str) -> dict:
    """Authenticate a contestant by email/password and return an auth token."""
    result = await db.execute(select(Contestant).where(Contestant.email == email))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱未注册")
    if not verify_password(password, c.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="密码错误")
    return _build_auth_response(c)


# ── Profile ──────────────────────────────────────────────────────


async def get_contestant_profile(db: AsyncSession, contestant_id: int) -> Contestant:
    result = await db.execute(select(Contestant).where(Contestant.id == contestant_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="选手不存在")
    return c


async def update_contestant_profile(
    db: AsyncSession, contestant_id: int, data: ContestantProfileUpdate,
) -> Contestant:
    """Update mutable fields on a contestant profile. Only supplied (non-None) fields are changed."""
    c = await get_contestant_profile(db, contestant_id)

    if data.name is not None:
        c.name = data.name
    if data.email is not None and data.email != c.email:
        existing = await db.execute(select(Contestant).where(Contestant.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已被使用")
        c.email = data.email
    if data.organization is not None:
        c.organization = data.organization

    await db.commit()
    await db.refresh(c)
    return c


# ── My registrations / results ───────────────────────────────────


async def _enrich_registration_item(db: AsyncSession, reg: Registration) -> dict:
    """Given a Registration row, build the response dict with masked PII."""
    from app.models.contest import Contest, ContestStatus
    from app.utils.crypto import decrypt_value

    ct = await db.execute(select(Contest).where(Contest.id == reg.contest_id))
    contest = ct.scalar_one_or_none()

    rr = await db.execute(select(Result).where(
        Result.registration_id == reg.id, Result.is_published == True,
    ))
    result_row = rr.scalar_one_or_none()

    status_labels = {
        ContestStatus.open: "报名中",
        ContestStatus.ongoing: "进行中",
        ContestStatus.finished: "已结束",
        ContestStatus.draft: "未发布",
        ContestStatus.cancelled: "已取消",
    }

    # Build a masked copy of form_data for the response
    safe_form_data = dict(reg.form_data)
    if "id_number" in safe_form_data:
        safe_form_data["id_number"] = mask_id_number(decrypt_value(safe_form_data["id_number"]))

    item = {
        "id": reg.id,
        "registration_number": reg.registration_number,
        "contest_id": reg.contest_id,
        "contest_title": contest.title if contest else "未知赛事",
        "contest_status": contest.status.value if contest else "unknown",
        "contest_status_label": status_labels.get(contest.status, contest.status.value) if contest else "未知",
        "form_data": safe_form_data,
        "submitted_at": reg.submitted_at.isoformat() if reg.submitted_at else None,
    }

    if result_row:
        award_name = await lookup_award_name(db, result_row.award_id)
        item["result"] = {
            "total_score": float(result_row.total_score),
            "rank": result_row.rank,
            "award_name": award_name,
            "scores": result_row.scores,
        }
    else:
        item["result"] = None

    return item


async def get_my_registrations(db: AsyncSession, contestant_id: int) -> list[dict]:
    """Return all registrations for the given contestant, with masked PII."""
    result = await db.execute(
        select(Registration).where(
            Registration.contestant_id == contestant_id, Registration.deleted_at.is_(None),
        ).order_by(Registration.submitted_at.desc())
    )
    regs = list(result.scalars().all())

    output = []
    for reg in regs:
        item = await _enrich_registration_item(db, reg)
        output.append(item)
    return output


async def get_my_results(db: AsyncSession, contestant_id: int) -> list[dict]:
    """Return published results for all of the contestant's registrations."""
    reg_data = await get_my_registrations(db, contestant_id)
    results_list = []
    for reg_dict in reg_data:
        r = await db.execute(select(Result).where(
            Result.registration_id == reg_dict["id"], Result.is_published == True,
        ))
        result = r.scalar_one_or_none()
        if result:
            award_name = await lookup_award_name(db, result.award_id)
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
