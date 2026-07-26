from datetime import datetime, timedelta, timezone
import secrets
from jose import jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.config import get_settings
from app.models.contestant import Contestant
from app.models.registration import Registration
from app.models.result import Result
from app.schemas.contestant import ContestantRegister, ContestantProfileUpdate
from app.services.auth_service import hash_password, verify_password
from app.services.result_service import lookup_award_name
from app.utils.crypto import keyed_hash, mask_id_number, mask_email  # mask_id_number used in _enrich_registration_item


# ── Token ────────────────────────────────────────────────────────


def create_contestant_token(contestant_id: int) -> str:
    """Issue a signed JWT for the given contestant.  No PII in the payload."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(contestant_id), "type": "contestant", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _build_auth_response(contestant: Contestant) -> dict:
    """Build the standard login/register response dict.

    id_number is masked — after registration the full value should not
    leave the backend.  Contest registration uses the DB-stored value.
    """
    token = create_contestant_token(contestant.id)
    return {
        "access_token": token,
        "user": {
            "id": contestant.id,
            "name": contestant.name,
            "email": contestant.email,
            # May be None until the contestant binds an id_number at first registration.
            "id_number": mask_id_number(contestant.id_number) if contestant.id_number else None,
            "organization": contestant.organization,
        },
    }


# ── Auth operations ──────────────────────────────────────────────


async def register_contestant(db: AsyncSession, data: ContestantRegister) -> dict:
    """Create a new contestant account and return an auth token."""
    email_hash = keyed_hash(data.email)
    existing = await db.execute(select(Contestant).where(Contestant.email_hash == email_hash))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已注册")

    c = Contestant(
        email=data.email,
        email_hash=email_hash,
        password_hash=hash_password(data.password),
        name=data.name,
        organization=data.organization,
    )
    db.add(c)
    try:
        await db.commit()
    except IntegrityError:
        # 并发下同邮箱注册撞 email_hash 唯一索引
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已注册")
    await db.refresh(c)
    return _build_auth_response(c)


async def login_contestant(db: AsyncSession, email: str, password: str) -> dict:
    """Authenticate a contestant by email/password and return an auth token."""
    result = await db.execute(select(Contestant).where(Contestant.email_hash == keyed_hash(email)))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱未注册")
    if c.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="该账号已注销")
    if not verify_password(password, c.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="密码错误")
    return _build_auth_response(c)


# ── Profile ──────────────────────────────────────────────────────


async def get_contestant_profile(db: AsyncSession, contestant_id: int) -> Contestant:
    result = await db.execute(select(Contestant).where(Contestant.id == contestant_id))
    c = result.scalar_one_or_none()
    if not c or c.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="选手不存在")
    return c


async def change_contestant_password(db: AsyncSession, contestant_id: int,
                                     old_password: str, new_password: str) -> None:
    """Change a contestant's password after verifying the old one."""
    c = await get_contestant_profile(db, contestant_id)
    if not verify_password(old_password, c.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="原密码不正确")
    c.password_hash = hash_password(new_password)
    await db.commit()


async def deactivate_contestant(db: AsyncSession, contestant_id: int, password: str) -> str:
    """自助注销账号（个保法第 47 条删除权）。

    - 校验密码后执行，防止他人持 token 恶意注销；
    - 账号 PII 清除且不可恢复：姓名匿名化、身份证号/单位置空、
      邮箱改写为 deleted_{id}@deleted.invalid（释放原邮箱供再注册）；
    - 报名记录保留关联（成绩数据不断裂），其中 form_data 的邮箱脱敏；
    - 历史同意流水（consent_logs）中的邮箱同步脱敏——举证可凭
      contestant_id + 脱敏邮箱达成，无需保留明文；
    - 账号报名的身份证号本就不在报名记录中冗余，随账号清除即全部失效。
    """
    c = await get_contestant_profile(db, contestant_id)
    if not verify_password(password, c.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="密码不正确")

    # 报名记录去标识化：form_data 中的邮箱脱敏（姓名保留以维持成绩可读）
    regs = (await db.execute(select(Registration).where(Registration.contestant_id == contestant_id))).scalars().all()
    for reg in regs:
        form_data = dict(reg.form_data or {})
        if form_data.get("email"):
            form_data["email"] = mask_email(form_data["email"])
            reg.form_data = form_data

    # 历史同意流水中的明文邮箱脱敏（append-only 触发器的合规维护通道）
    from sqlalchemy import text as sa_text
    from app.models.consent_log import ConsentLog
    await db.execute(sa_text("SET LOCAL app.log_maintenance = 'on'"))
    consent_rows = (await db.execute(
        select(ConsentLog).where(ConsentLog.contestant_id == contestant_id)
    )).scalars().all()
    for row in consent_rows:
        if row.email and "@" in row.email and not row.email.startswith("deleted_"):
            row.email = mask_email(row.email)

    original_email = c.email
    masked_email = mask_email(original_email)
    c.name = "已注销用户"
    c.id_number = None
    c.organization = None
    c.email = f"deleted_{c.id}@deleted.invalid"
    c.email_hash = keyed_hash(c.email)
    c.password_hash = hash_password(secrets.token_urlsafe(32))  # 不可再登录
    c.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return masked_email  # 供审计日志/撤回记录使用（不留明文）


async def get_my_data(db: AsyncSession, contestant_id: int) -> dict:
    """查阅/复制个人数据（个保法第 45 条）：账号信息 + 报名 + 成绩 + 同意记录。

    身份证号返回脱敏值——明文只在数据库中存在，接口一律不输出。
    """
    from app.services.consent_service import get_consent_states

    c = await get_contestant_profile(db, contestant_id)
    registrations = await get_my_registrations(db, contestant_id)
    results = await get_my_results(db, contestant_id)
    consents = await get_consent_states(db, contestant_id)
    return {
        "profile": {
            "email": c.email,
            "name": c.name,
            "id_number": mask_id_number(c.id_number) if c.id_number else None,
            "organization": c.organization,
            "registered_at": c.created_at.isoformat() if c.created_at else None,
        },
        "registrations": registrations,
        "results": results,
        "consents": consents,
    }


async def update_contestant_profile(
    db: AsyncSession, contestant_id: int, data: ContestantProfileUpdate,
) -> Contestant:
    """Update mutable fields on a contestant profile. Only supplied (non-None) fields are changed."""
    c = await get_contestant_profile(db, contestant_id)

    if data.name is not None:
        c.name = data.name
    if data.email is not None and keyed_hash(data.email) != c.email_hash:
        existing = await db.execute(select(Contestant).where(Contestant.email_hash == keyed_hash(data.email)))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已被使用")
        c.email = data.email
        c.email_hash = keyed_hash(data.email)
    if data.organization is not None:
        c.organization = data.organization
    if data.id_number is not None:
        # 选手绑定/更正本人身份证号（格式与校验位已在 schema 层校验）
        c.id_number = data.id_number

    await db.commit()
    await db.refresh(c)
    return c


# ── My registrations / results ───────────────────────────────────


async def _enrich_registration_item(db: AsyncSession, reg: Registration, account_masked_id: str | None = None) -> dict:
    """Given a Registration row, build the response dict with masked PII.

    account_masked_id: 调用方批量预取的账号脱敏身份证号（避免逐条查询）；
    传入 None 时按需要现场查询。
    """
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
    elif reg.contestant_id:
        # 账号绑定的报名不在 form_data 冗余存身份证号，从账号取并脱敏
        if account_masked_id is None:
            c = await db.execute(select(Contestant).where(Contestant.id == reg.contestant_id))
            contestant_row = c.scalar_one_or_none()
            if contestant_row and contestant_row.id_number:
                account_masked_id = mask_id_number(contestant_row.id_number)
        if account_masked_id:
            safe_form_data["id_number"] = account_masked_id

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

    # 同一选手只取一次账号脱敏身份证号，避免逐条报名重复查询
    account_masked_id = None
    if regs:
        c = await get_contestant_profile(db, contestant_id)
        if c.id_number:
            account_masked_id = mask_id_number(c.id_number)

    output = []
    for reg in regs:
        item = await _enrich_registration_item(db, reg, account_masked_id)
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
