"""未成年人保护模块测试（BDD 07-未成年人保护.feature @M1-M10）。

覆盖三级开关：系统开关关闭/赛事未标记 → 普通流程零变化；
双开关开启 → 按年龄分支（<14 监护人同意 / 14-18 本人声明）。
"""

import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy import select

from app.models.consent_log import ConsentLog
from app.models.contest import Contest, ContestStatus, MinorPolicy
from app.models.contestant import Contestant
from app.models.registration import Registration
from app.models.system_setting import SystemSetting
from app.schemas.registration import RegistrationCreate
from app.services import consent_service, contestant_service, registration_service, settings_service
from app.utils.crypto import decrypt_value
from app.utils.minor import age_at, age_at_str, requirement_for_age, mask_birth_date, parse_birth_date

from .conftest import VALID_ID_A, make_id_number


# ── 工具函数 ─────────────────────────────────────────────────────


async def _enable_minor_protection(db, on: bool = True):
    """幂等：重复调用只更新值，不重复插入。"""
    row = (await db.execute(select(SystemSetting).where(
        SystemSetting.key == settings_service.MINOR_PROTECTION_MODE_KEY,
    ))).scalar_one_or_none()
    if row:
        row.value = "on" if on else "off"
    else:
        db.add(SystemSetting(key=settings_service.MINOR_PROTECTION_MODE_KEY, value="on" if on else "off"))
    await db.commit()


_admin_seq = 0


async def _make_contest(db, *, minor_policy: str = "normal", start_date=None, end_date=None):
    from app.models.user import User
    from app.services.auth_service import hash_password

    global _admin_seq
    _admin_seq += 1
    admin = User(username=f"admin_{minor_policy}_{_admin_seq}", password_hash=hash_password("Admin123"), name="管理员", phone="")
    db.add(admin)
    await db.flush()
    now = datetime.now()
    c = Contest(
        creator_id=admin.id, title=f"测试赛事-{minor_policy}",
        start_date=start_date or now, end_date=end_date or (now + timedelta(days=30)),
        registration_start=now - timedelta(days=1), registration_end=now + timedelta(days=10),
        status=ContestStatus.open, timezone="UTC",
        minor_policy=MinorPolicy(minor_policy),
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


async def _register(db, contest, *, birth_date=None, guardian_name=None, guardian_contact=None,
                    guardian_agreed=False, minor_statement_agreed=False, contestant_id=None,
                    email="a@test.com", id_number=None):
    # 未显式指定身份证号时，按出生日期生成内嵌一致的合法号码
    # （出生日期与身份证号交叉校验自 2026-08 起强制一致）
    if id_number is None:
        id_number = make_id_number(birth_date) if birth_date else VALID_ID_A
    return await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="测试选手", email=email, id_number=id_number,
        id_number_agreed=True, privacy_agreed=True,
        birth_date=birth_date, guardian_name=guardian_name, guardian_contact=guardian_contact,
        guardian_agreed=guardian_agreed, minor_statement_agreed=minor_statement_agreed,
    ), contestant_id=contestant_id)


async def _register_contestant(db, email="a@test.com"):
    from app.schemas.contestant import ContestantRegister
    result = await contestant_service.register_contestant(
        db, ContestantRegister(email=email, password="Passw0rd", name="测试选手", privacy_agreed=True))
    return result["user"]["id"]


async def _latest_consent(db, contestant_id, ctype):
    rows = (await db.execute(select(ConsentLog).where(
        ConsentLog.contestant_id == contestant_id, ConsentLog.consent_type == ctype,
    ).order_by(ConsentLog.id.desc()))).scalars().all()
    return rows[0] if rows else None


# ── 工具函数：年龄计算 ───────────────────────────────────────────


def test_age_calculation():
    birth = parse_birth_date("2012-09-15")
    assert birth is not None
    # 2026-09-14 尚未满 14 周岁；2026-09-15 当天满 14 周岁（BDD @M6）
    assert age_at(birth, datetime(2026, 9, 14).date()) == 13
    assert age_at(birth, datetime(2026, 9, 15).date()) == 14
    assert age_at_str("2012-09-15", datetime(2026, 10, 1).date()) == 14
    assert age_at_str("bad-date", datetime(2026, 10, 1).date()) is None
    assert requirement_for_age(13) == "guardian"
    assert requirement_for_age(14) == "statement"
    assert requirement_for_age(17) == "statement"
    assert requirement_for_age(18) == "adult"
    assert mask_birth_date("2012-09-15") == "2012-**-**"


def test_leap_year_birthday():
    # 2 月 29 日出生：2026-02-28 仍 13 岁，2026-03-01 已满 14 岁
    birth = parse_birth_date("2012-02-29")
    assert birth is not None
    assert age_at(birth, datetime(2026, 2, 28).date()) == 13
    assert age_at(birth, datetime(2026, 3, 1).date()) == 14


async def test_future_birth_date_rejected(db):
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    future = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    with pytest.raises(HTTPException) as exc:
        await _register(db, c, birth_date=future)
    assert "不能晚于今天" in exc.value.detail


async def test_birth_date_must_match_id_number(db):
    """vuln-0023 回归：自报出生日期必须与身份证号内嵌日期一致。

    身份证号内嵌 2015-09-30（<14 周岁），却自报成人出生日期 → 400；
    一致时按未成年人分支正常要求监护人同意。
    """
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    child_id = "110101201509302342"  # 内嵌出生日期 2015-09-30，校验位有效
    with pytest.raises(HTTPException) as exc:
        await _register(db, c, birth_date="1980-01-01", id_number=child_id)
    assert "出生日期与身份证号不一致" in exc.value.detail

    reg = await _register(db, c, birth_date="2015-09-30", id_number=child_id,
                          guardian_name="王家长", guardian_contact="13800000000",
                          guardian_agreed=True)
    assert reg.contestant_id is None
    assert decrypt_value(reg.form_data["birth_date"]) == "2015-09-30"


async def test_account_birth_auto_corrected_to_match_id(db):
    """复查修复：账号绑定生日与证号不一致时以证号为准自动更正，不锁死报名。

    复现场景：个人中心更正证号后，账号生日仍是旧值；再次报名必须成功
    且账号生日被更正为新证号内嵌日期（而不是永久 400）。
    """
    await _enable_minor_protection(db)
    c1 = await _make_contest(db, minor_policy="minors_welcome")
    c2 = await _make_contest(db, minor_policy="minors_welcome")
    cid = await _register_contestant(db)
    # 首次报名：生日 2010-05-05 + 内嵌一致的证号绑定
    await _register(db, c1, birth_date="2010-05-05", minor_statement_agreed=True,
                    contestant_id=cid, id_number=make_id_number("2010-05-05"))
    # 模拟个人中心更正证号：新证号内嵌 2005-05-05，账号生日仍是旧值
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    row.id_number = make_id_number("2005-05-05")
    await db.commit()
    # 再次报名不提交出生日期 → 以证号为准自动更正，报名成功
    reg = await _register(db, c2, contestant_id=cid)
    assert reg.contestant_id == cid
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert row.birth_date == "2005-05-05"


# ── @M1 系统开关关闭：流程与常规完全一致 ─────────────────────────


async def test_system_off_ignores_minor_fields(db):
    c = await _make_contest(db, minor_policy="minors_welcome")
    # 即使赛事标记了 minors_welcome，系统关闭时提交的年龄/监护人字段被忽略
    reg = await _register(db, c, birth_date="2016-05-05")  # 10 岁，但无监护人信息也应成功
    assert reg.contestant_id is None
    form = reg.form_data
    assert "birth_date" not in form and "guardian_name" not in form
    # 无未成年人相关同意记录
    assert await _latest_consent(db, None, "guardian_consent") is None
    assert await _latest_consent(db, None, "minor_statement") is None


async def test_system_on_but_normal_contest_unchanged(db):
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="normal")
    reg = await _register(db, c, birth_date="2016-05-05")  # 字段可提交但完全不参与校验
    form = reg.form_data
    assert "birth_date" not in form
    assert await _latest_consent(db, None, "guardian_consent") is None


# ── @M3 14-18 岁：本人「已满 14 周岁」声明 ───────────────────────


async def test_minor_contest_requires_statement(db):
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    with pytest.raises(HTTPException) as exc:
        await _register(db, c, birth_date="2010-05-05")  # 16 岁，未勾选声明
    assert "已满 14 周岁" in exc.value.detail

    cid = await _register_contestant(db)
    reg = await _register(db, c, birth_date="2010-05-05", minor_statement_agreed=True, contestant_id=cid)
    assert reg.contestant_id == cid
    # 出生日期懒收集绑定到账号（加密存储）
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert row.birth_date == "2010-05-05"
    # 同意流水
    log = await _latest_consent(db, cid, "minor_statement")
    assert log is not None and log.action == "granted"
    assert await _latest_consent(db, cid, "guardian_consent") is None
    # 账号报名不在 form_data 冗余出生日期
    assert "birth_date" not in reg.form_data


# ── @M4 14 岁以下：监护人同意 ────────────────────────────────────


async def test_child_requires_guardian_consent(db):
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    with pytest.raises(HTTPException) as exc:
        await _register(db, c, birth_date="2016-05-05")  # 10 岁，无监护人信息
    assert "监护人姓名与联系方式" in exc.value.detail

    with pytest.raises(HTTPException) as exc:
        await _register(db, c, birth_date="2016-05-05",
                        guardian_name="张家长", guardian_contact="13800000000")  # 未勾选监护人同意
    assert "监护人同意" in exc.value.detail

    cid = await _register_contestant(db)
    reg = await _register(db, c, birth_date="2016-05-05",
                          guardian_name="张家长", guardian_contact="13800000000",
                          guardian_agreed=True, contestant_id=cid)
    assert reg.contestant_id == cid
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert row.birth_date == "2016-05-05"
    assert row.guardian_name == "张家长"
    assert row.guardian_contact == "13800000000"
    log = await _latest_consent(db, cid, "guardian_consent")
    assert log is not None and log.action == "granted"


# ── @M5 已满 14 周岁无需监护人信息 ───────────────────────────────


async def test_minor_over_14_needs_no_guardian(db):
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    cid = await _register_contestant(db)
    reg = await _register(db, c, birth_date="2011-05-05", minor_statement_agreed=True, contestant_id=cid)  # 15 岁
    assert reg.contestant_id == cid
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert row.guardian_name is None
    assert await _latest_consent(db, cid, "guardian_consent") is None


# ── @M6 年龄以赛事开始日计算 ─────────────────────────────────────


async def test_age_computed_at_contest_start(db):
    await _enable_minor_protection(db)
    # 报名时未满 14，但赛事开始日已满 14 → 按已满 14 周岁处理
    c = await _make_contest(db, minor_policy="minors_welcome", start_date=datetime(2026, 10, 1))
    cid = await _register_contestant(db)
    reg = await _register(db, c, birth_date="2012-09-15", minor_statement_agreed=True, contestant_id=cid)
    assert reg.contestant_id == cid
    assert await _latest_consent(db, cid, "guardian_consent") is None
    assert await _latest_consent(db, cid, "minor_statement") is not None


# ── @M7 撤回监护人同意 → 删除出生日期与监护人信息 ───────────────


async def test_withdraw_guardian_consent_clears_fields(db):
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    cid = await _register_contestant(db)
    await _register(db, c, birth_date="2016-05-05", guardian_name="张家长",
                    guardian_contact="13800000000", guardian_agreed=True, contestant_id=cid)

    await consent_service.withdraw_consent(db, cid, "guardian_consent")
    await db.commit()
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert row.birth_date is None
    assert row.guardian_name is None
    assert row.guardian_contact is None
    log = await _latest_consent(db, cid, "guardian_consent")
    assert log.action == "withdrawn"


# ── @M8 账号已绑定出生日期：再次报名无需重复填写 ─────────────────


async def test_bound_birth_date_reused(db):
    await _enable_minor_protection(db)
    c1 = await _make_contest(db, minor_policy="minors_welcome")
    c2 = await _make_contest(db, minor_policy="minors_welcome")
    cid = await _register_contestant(db)
    await _register(db, c1, birth_date="2011-05-05", minor_statement_agreed=True, contestant_id=cid)
    # 第二次报名不再提交出生日期，直接复用账号值
    reg = await _register(db, c2, minor_statement_agreed=True, contestant_id=cid)
    assert reg.contestant_id == cid
    assert "birth_date" not in reg.form_data


# ── @M7 撤回后再次报名：必须重新收集 ─────────────────────────────


async def test_withdraw_then_reregister_recollects(db):
    """撤回监护人同意后账号字段清空；再次报名面向未成年人的赛事须重新收集。"""
    await _enable_minor_protection(db)
    c1 = await _make_contest(db, minor_policy="minors_welcome")
    c2 = await _make_contest(db, minor_policy="minors_welcome")
    cid = await _register_contestant(db)
    await _register(db, c1, birth_date="2016-05-05", guardian_name="张家长",
                    guardian_contact="13800000000", guardian_agreed=True, contestant_id=cid)

    await consent_service.withdraw_consent(db, cid, "guardian_consent")
    await db.commit()
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert row.birth_date is None and row.guardian_name is None

    # 不重新提交出生日期 → 被拒
    with pytest.raises(HTTPException) as exc:
        await _register(db, c2, contestant_id=cid)
    assert "请填写出生日期" in exc.value.detail

    # 重新收集后再次绑定（身份证号已绑定账号、内嵌生日固定，重新申报须一致）
    await _register(db, c2, birth_date="2016-05-05", guardian_name="李家长",
                    guardian_contact="13900000000", guardian_agreed=True, contestant_id=cid)
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert row.birth_date == "2016-05-05"
    assert row.guardian_name == "李家长"


# ── minor-requirement 端点（报名页分支查询）──────────────────────


async def test_minor_requirement_endpoint(db):
    import httpx
    from httpx import ASGITransport

    from app.main import app
    from app.services.contestant_service import create_contestant_token

    await _enable_minor_protection(db)
    minor_c = await _make_contest(db, minor_policy="minors_welcome")
    normal_c = await _make_contest(db, minor_policy="normal")
    transport = ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 未登录且未绑定生日 → unknown（前端需收集出生日期）
        r = await client.get(f"/api/public/contests/{minor_c.id}/minor-requirement")
        assert r.status_code == 200
        assert r.json() == {"active": True, "requirement": "unknown"}

        # 普通赛事 → 模块不激活
        r = await client.get(f"/api/public/contests/{normal_c.id}/minor-requirement")
        assert r.json() == {"active": False, "requirement": "none"}

        # 已绑定生日：16 岁 → statement；10 岁 → guardian
        cid16 = await _register_contestant(db, "s16@test.com")
        await _register(db, minor_c, birth_date="2010-05-05", minor_statement_agreed=True,
                        contestant_id=cid16, email="s16@test.com")
        r = await client.get(f"/api/public/contests/{minor_c.id}/minor-requirement",
                             headers={"Authorization": f"Bearer {create_contestant_token(cid16)}"})
        assert r.json() == {"active": True, "requirement": "statement"}

        cid10 = await _register_contestant(db, "s10@test.com")
        await _register(db, minor_c, birth_date="2016-05-05", guardian_name="张家长",
                        guardian_contact="13800000000", guardian_agreed=True,
                        contestant_id=cid10, email="s10@test.com")
        r = await client.get(f"/api/public/contests/{minor_c.id}/minor-requirement",
                             headers={"Authorization": f"Bearer {create_contestant_token(cid10)}"})
        assert r.json() == {"active": True, "requirement": "guardian"}

    # 系统开关关闭 → 即使赛事标记 minors_welcome 也不激活
    await _enable_minor_protection(db, on=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(f"/api/public/contests/{minor_c.id}/minor-requirement")
        assert r.json() == {"active": False, "requirement": "none"}


# ── @M9 匿名报名 14 岁以下：监护人信息入 form_data ──────────────


async def test_anonymous_child_registration(db):
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    reg = await _register(db, c, birth_date="2018-05-05",  # 8 岁
                          guardian_name="王家长", guardian_contact="wang@example.com",
                          guardian_agreed=True)
    assert reg.contestant_id is None
    form = reg.form_data
    assert decrypt_value(form["birth_date"]) == "2018-05-05"
    assert decrypt_value(form["guardian_name"]) == "王家长"
    assert decrypt_value(form["guardian_contact"]) == "wang@example.com"
    log = await _latest_consent(db, None, "guardian_consent")
    assert log is not None and log.action == "granted" and log.email == "a@test.com"


# ── 序列化脱敏：管理端与个人中心不出现明文 ───────────────────────


async def test_serialization_masks_minor_fields(db):
    from app.services import registration_service as rs

    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    # 匿名报名（form_data 含密文）→ 接口返回脱敏值
    reg = await _register(db, c, birth_date="2018-05-05", guardian_name="王家长",
                          guardian_contact="wang@example.com", guardian_agreed=True)
    out = await rs.serialize_registration(db, reg)
    assert out["form_data"]["birth_date"] == "2018-**-**"
    assert out["form_data"]["guardian_name"] == "王**"
    assert "wang@" not in out["form_data"]["guardian_contact"]
    # 账号报名（无 form_data 副本）→ 从账号注入脱敏出生日期
    cid = await _register_contestant(db)
    reg2 = await _register(db, c, birth_date="2011-05-05", minor_statement_agreed=True,
                           contestant_id=cid)
    out2 = await rs.serialize_registration(db, reg2)
    assert out2["form_data"]["birth_date"] == "2011-**-**"
    # 个人中心 my-data 同样脱敏
    data = await contestant_service.get_my_data(db, cid)
    assert data["profile"]["birth_date"] == "2011-**-**"


# ── 清理与注销联动 ──────────────────────────────────────────────


async def test_cleanup_clears_anonymous_minor_fields(db):
    from app.services.cleanup_service import run_cleanup_once

    await _enable_minor_protection(db)
    # 已结束超过保留期的赛事（保留期设为 1 天）
    db.add(SystemSetting(key="registration_retention_days", value="1"))
    await db.commit()
    c = await _make_contest(db, minor_policy="minors_welcome",
                            start_date=datetime.now() - timedelta(days=10),
                            end_date=datetime.now() - timedelta(days=5))
    await _register(db, c, birth_date="2018-05-05", guardian_name="王家长",
                    guardian_contact="13800000000", guardian_agreed=True)
    stats = await run_cleanup_once(db)
    assert stats["cleared_pii_fields"] == 1
    rows = (await db.execute(select(Registration))).scalars().all()
    form = rows[0].form_data
    for key in ("id_number", "birth_date", "guardian_name", "guardian_contact"):
        assert key not in form


async def test_deactivate_clears_minor_fields(db):
    await _enable_minor_protection(db)
    c = await _make_contest(db, minor_policy="minors_welcome")
    cid = await _register_contestant(db)
    await _register(db, c, birth_date="2016-05-05", guardian_name="张家长",
                    guardian_contact="13800000000", guardian_agreed=True, contestant_id=cid)
    await contestant_service.deactivate_contestant(db, cid, "Passw0rd")
    row = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert row.birth_date is None
    assert row.guardian_name is None
    assert row.guardian_contact is None
