from datetime import datetime, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.contest import Contest, ContestGroup, ContestStatus, MinorPolicy
from app.models.contestant import Contestant
from app.models.registration import Registration
from app.schemas.registration import RegistrationCreate, RegistrationOut, RESERVED_FORM_FIELDS
from app.services.settings_service import get_minor_protection_enabled
from app.utils.timezone import to_aware
from app.utils.crypto import encrypt_value, decrypt_value, mask_id_number
from app.utils.minor import (
    GUARDIAN_AGE_LIMIT,
    ADULT_AGE_LIMIT,
    parse_birth_date,
    age_at_str,
)


def _gen_registration_number(contest_id: int, seq: int) -> str:
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y%m%d")
    return f"C{contest_id:03d}-{date_str}-{seq:04d}"


async def register(db: AsyncSession, data: RegistrationCreate, contestant_id: int | None = None,
                   request=None) -> Registration:
    # ── Resolve id_number ──────────────────────────────────────────
    # 账号已绑定身份证：直接使用账号值，不在报名记录中冗余存储。
    # 账号未绑定 / 匿名报名：使用表单提交的值（要求敏感信息单独同意）；
    # 登录用户提交后顺带绑定到账号，供后续赛事复用。
    contestant_row = None
    if contestant_id is not None:
        c_result = await db.execute(select(Contestant).where(Contestant.id == contestant_id))
        contestant_row = c_result.scalar_one_or_none()
        if contestant_row is not None and contestant_row.deleted_at is not None:
            # 防御：已注销账号不得以账号身份报名（middleware 已拦截，此处兜底）
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号已注销")

    if contestant_row is not None and contestant_row.id_number:
        id_number = contestant_row.id_number  # EncryptedString auto-decrypts
    else:
        if not data.id_number:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请填写身份证号")
        if not data.id_number_agreed:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="身份证号属于敏感个人信息，请勾选单独同意后再提交")
        id_number = data.id_number
        if contestant_row is not None:
            # 首次报名时绑定到账号（最小必要：注册阶段不收集）
            contestant_row.id_number = data.id_number

    # Validate contest is open
    result = await db.execute(select(Contest).where(Contest.id == data.contest_id))
    contest = result.scalar_one_or_none()
    if not contest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="赛事不存在")
    if contest.status != ContestStatus.open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该赛事当前不可报名")

    # ── 未成年人保护分支（条件性必填，仅双开关开启时生效）─────────
    # 系统开关 off 或赛事 minor_policy=normal 时，本模块完全不介入：
    # 年龄/监护人字段可空、不校验、不入库，普通流程与现状一致。
    minor_active = False
    birth_date = ""
    age = None
    if contest.minor_policy == MinorPolicy.minors_welcome and await get_minor_protection_enabled(db):
        minor_active = True
        # 账号已绑定的出生日期复用（懒收集），否则用表单提交值
        if contestant_row is not None and contestant_row.birth_date:
            birth_date = contestant_row.birth_date
        else:
            birth_date = data.birth_date or ""
        if not birth_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="该赛事面向未成年人，请填写出生日期")
        if parse_birth_date(birth_date) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="出生日期格式不正确")
        if parse_birth_date(birth_date) > datetime.now(timezone.utc).date():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="出生日期不能晚于今天")
        # 交叉校验：18 位身份证号第 7-14 位编码出生日期，必须与使用的出生日期
        # 一致，防止未成年人通过虚报生日绕过监护人同意分支（vuln-0023）。
        if len(id_number or "") == 18:
            id_birth = f"{id_number[6:10]}-{id_number[10:12]}-{id_number[12:14]}"
            if id_birth != birth_date:
                if contestant_row is not None:
                    # 账号绑定生日与证号不一致（如个人中心更正证号、存量数据）：
                    # 以校验位合法的证号为权威来源自动更正，避免永久锁死报名。
                    # 证号是更强的凭据；更正只会让年龄分支更准确，不会放宽保护。
                    birth_date = id_birth
                    contestant_row.birth_date = id_birth
                    if parse_birth_date(birth_date) > datetime.now(timezone.utc).date():
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                            detail="出生日期不能晚于今天")
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                        detail="出生日期与身份证号不一致，请核对后重新提交")
        # 资格判定以赛事开始日为准（不是报名日），存生日不存年龄
        age = age_at_str(birth_date, contest.start_date.date() if contest.start_date else datetime.now(timezone.utc).date())
        if age is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="出生日期格式不正确")
        if age < GUARDIAN_AGE_LIMIT:
            # 监护人信息同样懒收集：账号已登记则复用，否则取表单值
            guardian_name = (contestant_row.guardian_name if contestant_row and contestant_row.guardian_name
                             else (data.guardian_name or ""))
            guardian_contact = (contestant_row.guardian_contact if contestant_row and contestant_row.guardian_contact
                                else (data.guardian_contact or ""))
            if not guardian_name or not guardian_contact:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="14 周岁以下选手报名需填写监护人姓名与联系方式")
            if not data.guardian_agreed:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="14 周岁以下选手报名须征得监护人同意，请勾选监护人同意")
        elif age < ADULT_AGE_LIMIT:
            if not data.minor_statement_agreed:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="请勾选确认本人已满 14 周岁后再提交")

    if minor_active and contestant_row is not None:
        # 未成年人字段懒收集绑定：账号已有值则复用，首次提交时绑定
        if not contestant_row.birth_date:
            contestant_row.birth_date = birth_date
        if age is not None and age < GUARDIAN_AGE_LIMIT:
            if not contestant_row.guardian_name and data.guardian_name:
                contestant_row.guardian_name = data.guardian_name
            if not contestant_row.guardian_contact and data.guardian_contact:
                contestant_row.guardian_contact = data.guardian_contact

    now = datetime.now(timezone.utc)
    tz = contest.timezone

    # Check registration window
    reg_start = to_aware(contest.registration_start, tz)
    if now < reg_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="报名尚未开始")

    reg_end = to_aware(contest.registration_end, tz)
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

    # Check duplicate — same account already registered, or same id_number
    # among anonymous submissions (account-bound regs carry no form_data copy).
    if contestant_id is not None:
        dup_result = await db.execute(
            select(func.count(Registration.id)).where(
                and_(
                    Registration.contest_id == data.contest_id,
                    Registration.group_id == data.group_id,
                    Registration.contestant_id == contestant_id,
                    Registration.deleted_at.is_(None),
                )
            )
        )
        if (dup_result.scalar() or 0) > 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="您已在此赛事此组别报名")

    existing_regs = list((await db.execute(
        select(Registration).where(
            and_(
                Registration.contest_id == data.contest_id,
                Registration.group_id == data.group_id,
                Registration.deleted_at.is_(None),
            )
        )
    )).scalars().all())

    # 跨账号同证号比对：匿名报名比 form_data 密文（解密），账号报名比账号上的证号。
    # 批量取账号避免逐条查询；身份证号不做真实核验，此比对为尽力去重。
    bound_cids = {r.contestant_id for r in existing_regs if r.contestant_id}
    bound_ids: dict[int, str] = {}
    if bound_cids:
        c_rows = await db.execute(
            select(Contestant.id, Contestant.id_number).where(Contestant.id.in_(bound_cids))
        )
        bound_ids = {cid: idn for cid, idn in c_rows.all() if idn}

    for reg in existing_regs:
        stored_plain = bound_ids.get(reg.contestant_id) if reg.contestant_id else None
        if stored_plain is None:
            stored_encrypted = reg.form_data.get("id_number", "")
            stored_plain = decrypt_value(stored_encrypted) if stored_encrypted else ""
        if stored_plain and stored_plain == id_number:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该身份证号已在此赛事此组别报名")

    # Generate registration number + insert, retrying on registration_number
    # collision (并发下同号) — 唯一索引兜底，重算序号最多 3 次
    form_data = {
        "name": data.name,
        "email": data.email,
    }
    if contestant_row is None:
        form_data["id_number"] = encrypt_value(id_number)
        # 匿名报名的未成年人数据随报名保留期清理（见 cleanup_service）
        if minor_active:
            form_data["birth_date"] = encrypt_value(birth_date)
            if age is not None and age < GUARDIAN_AGE_LIMIT:
                form_data["guardian_name"] = encrypt_value(data.guardian_name or "")
                form_data["guardian_contact"] = encrypt_value(data.guardian_contact or "")
    if data.organization:
        form_data["organization"] = data.organization
    # 自定义字段剥离保留键（schema 已过滤，此处兜底）：防止明文覆写加密 PII
    # 或篡改 name/email/organization，从而绕过去重与名额控制（vuln-0022）。
    safe_custom_fields = {
        key: value for key, value in (data.custom_fields or {}).items()
        if key not in RESERVED_FORM_FIELDS
    }
    form_data.update(safe_custom_fields)

    reg = None
    for _attempt in range(3):
        count_r = await db.execute(select(func.count(Registration.id)).where(Registration.contest_id == data.contest_id))
        seq = (count_r.scalar() or 0) + 1
        reg = Registration(
            contest_id=data.contest_id,
            contestant_id=contestant_id,
            group_id=data.group_id,
            registration_number=_gen_registration_number(data.contest_id, seq),
            form_data=form_data,
        )
        db.add(reg)
        try:
            await db.commit()
            break
        except IntegrityError as e:
            await db.rollback()
            if "ux_registrations_contest_group_contestant" in str(e.orig):
                # 同账号同赛事同组别重复提交（含双击/重试）
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="您已提交过报名，请勿重复提交")
    else:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="报名提交失败，请重试")

    # 同意记录持久化（个保法举证）：隐私政策 + （如提交了身份证号）敏感信息单独同意
    # + 未成年人分支的监护人同意 / 已满 14 周岁声明
    from app.services.consent_service import record_consent
    await record_consent(db, consent_type="privacy", action="granted",
                         contestant_id=contestant_id, email=data.email, request=request)
    if data.id_number and data.id_number_agreed:
        await record_consent(db, consent_type="id_number", action="granted",
                             contestant_id=contestant_id, email=data.email, request=request)
    if minor_active and age is not None and age < GUARDIAN_AGE_LIMIT and data.guardian_agreed:
        await record_consent(db, consent_type="guardian_consent", action="granted",
                             contestant_id=contestant_id, email=data.email, request=request)
    elif minor_active and age is not None and age < ADULT_AGE_LIMIT and data.minor_statement_agreed:
        await record_consent(db, consent_type="minor_statement", action="granted",
                             contestant_id=contestant_id, email=data.email, request=request)
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


async def serialize_registrations(db: AsyncSession, regs: list[Registration]) -> list[dict]:
    """Serialize Registrations for admin APIs with masked PII.

    Account-bound registrations do not carry id_number in form_data;
    the masked value is injected from the contestant account instead.
    Contestants are fetched in one batch query to avoid N+1.
    """
    from app.utils.minor import mask_birth_date

    cids = {r.contestant_id for r in regs if r.contestant_id}
    masked_ids: dict[int, str] = {}
    masked_births: dict[int, str] = {}
    if cids:
        c_rows = await db.execute(
            select(Contestant.id, Contestant.id_number, Contestant.birth_date)
            .where(Contestant.id.in_(cids))
        )
        for cid, idn, birth in c_rows.all():
            if idn:
                masked_ids[cid] = mask_id_number(idn)
            if birth:
                masked_births[cid] = mask_birth_date(birth)

    outs = []
    for reg in regs:
        out = RegistrationOut.model_validate(reg).model_dump()
        form_data = dict(out.get("form_data") or {})
        if not form_data.get("id_number") and reg.contestant_id in masked_ids:
            form_data["id_number"] = masked_ids[reg.contestant_id]
        # 账号绑定的出生日期（报名记录不冗余存储）同样注入脱敏值
        if not form_data.get("birth_date") and reg.contestant_id in masked_births:
            form_data["birth_date"] = masked_births[reg.contestant_id]
        out["form_data"] = form_data
        outs.append(out)
    return outs


async def serialize_registration(db: AsyncSession, reg: Registration) -> dict:
    """Serialize a single Registration (see serialize_registrations)."""
    return (await serialize_registrations(db, [reg]))[0]


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
    """Fetch registrations for export.  form_data.id_number is still encrypted at this point."""
    query = select(Registration).where(Registration.contest_id == contest_id, Registration.deleted_at.is_(None))
    if group_ids:
        query = query.where(Registration.group_id.in_(group_ids))
    result = await db.execute(query.order_by(Registration.submitted_at))
    return list(result.scalars().all())
