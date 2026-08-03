"""合规改造核心链路测试：同意、密码策略、身份证懒绑定、注销、清理。

运行方式见 conftest.py 头部注释（需要一次性测试库容器）。
"""

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select

from app.models.contestant import Contestant
from app.models.consent_log import ConsentLog
from app.models.registration import Registration
from app.schemas.contestant import ContestantRegister, ContestantProfileUpdate
from app.schemas.registration import RegistrationCreate
from app.schemas.user import UserCreate
from app.services import contestant_service, registration_service, consent_service, settings_service

from .conftest import VALID_ID_A, VALID_ID_B


def make_contestant_payload(email="a@test.com", **kw):
    base = dict(email=email, password="Passw0rd", name="测试选手", privacy_agreed=True)
    base.update(kw)
    return ContestantRegister(**base)


async def register_contestant(db, email="a@test.com"):
    result = await contestant_service.register_contestant(db, make_contestant_payload(email))
    return result["user"]["id"]


# ── Schema 层：密码策略与明示同意 ─────────────────────────────────


def test_password_complexity():
    for weak in ("aaaaaaaa", "12345678", "abc", "AAAAAAAA"):
        with pytest.raises(ValidationError):
            UserCreate(username="ab", password=weak, name="x")
    assert UserCreate(username="ab", password="Admin123", name="x")


def test_privacy_agreement_required():
    with pytest.raises(ValidationError):
        ContestantRegister(email="a@b.com", password="Passw0rd", name="张三")  # 缺失
    with pytest.raises(ValidationError):
        ContestantRegister(email="a@b.com", password="Passw0rd", name="张三", privacy_agreed=False)
    with pytest.raises(ValidationError):
        RegistrationCreate(contest_id=1, name="张三", email="a@b.com")  # 缺失


def test_id_number_checksum():
    with pytest.raises(ValidationError):
        RegistrationCreate(contest_id=1, name="张三", email="a@b.com",
                           id_number="110101199003077750", privacy_agreed=True)


# ── 注册与登录 ────────────────────────────────────────────────────


async def test_register_without_id_number(db):
    cid = await register_contestant(db)
    c = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert c.id_number is None
    # 注册时写入隐私政策同意记录
    await consent_service.record_consent(db, consent_type="privacy", action="granted",
                                         contestant_id=cid, email="a@test.com")
    await db.commit()
    states = await consent_service.get_consent_states(db, cid)
    privacy = next(s for s in states if s["consent_type"] == "privacy")
    assert privacy["granted"] is True


async def test_login_and_deactivated_login_rejected(db):
    await register_contestant(db)
    assert await contestant_service.login_contestant(db, "a@test.com", "Passw0rd")

    cid = (await db.execute(select(Contestant.id))).scalar_one()
    await contestant_service.deactivate_contestant(db, cid, "Passw0rd")
    # 注销后原邮箱已改写释放，按"邮箱未注册"拒绝（不暴露账号曾存在）
    with pytest.raises(HTTPException) as exc:
        await contestant_service.login_contestant(db, "a@test.com", "Passw0rd")
    assert exc.value.status_code == 401


# ── 身份证懒绑定与报名 ────────────────────────────────────────────


async def test_first_registration_binds_id(db, contest):
    cid = await register_contestant(db)
    reg = await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="测试选手", email="a@test.com",
        id_number=VALID_ID_A, id_number_agreed=True, privacy_agreed=True,
    ), contestant_id=cid)
    assert "id_number" not in reg.form_data  # 账号报名不冗余存证号

    c = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert c.id_number == VALID_ID_A  # 已绑定账号

    # 同意记录包含 privacy 与 id_number 两条
    types = {r.consent_type for r in (await db.execute(select(ConsentLog))).scalars().all()}
    assert types == {"privacy", "id_number"}


async def test_registration_requires_separate_consent(db, contest):
    cid = await register_contestant(db)
    with pytest.raises(HTTPException) as exc:
        await registration_service.register(db, RegistrationCreate(
            contest_id=contest.id, name="测试选手", email="a@test.com",
            id_number=VALID_ID_A, privacy_agreed=True,  # 未勾 id_number_agreed
        ), contestant_id=cid)
    assert "单独同意" in exc.value.detail


async def test_cross_account_same_id_rejected(db, contest):
    cid1 = await register_contestant(db, "a1@test.com")
    cid2 = await register_contestant(db, "a2@test.com")
    await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="选手甲", email="a1@test.com",
        id_number=VALID_ID_A, id_number_agreed=True, privacy_agreed=True,
    ), contestant_id=cid1)
    await contestant_service.update_contestant_profile(db, cid2, ContestantProfileUpdate(id_number=VALID_ID_A))
    with pytest.raises(HTTPException, match="已在此赛事"):
        await registration_service.register(db, RegistrationCreate(
            contest_id=contest.id, name="选手乙", email="a2@test.com", privacy_agreed=True,
        ), contestant_id=cid2)


async def test_admin_serialization_masks_account_id(db, contest):
    cid = await register_contestant(db)
    reg = await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="测试选手", email="a@test.com",
        id_number=VALID_ID_A, id_number_agreed=True, privacy_agreed=True,
    ), contestant_id=cid)
    out = (await registration_service.serialize_registrations(db, [reg]))[0]
    assert out["form_data"]["id_number"] == "1101****7758"


# ── 撤回同意 / 查阅数据 / 改密 ───────────────────────────────────


async def test_withdraw_id_number_consent(db, contest):
    cid = await register_contestant(db)
    await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="测试选手", email="a@test.com",
        id_number=VALID_ID_A, id_number_agreed=True, privacy_agreed=True,
    ), contestant_id=cid)

    await consent_service.withdraw_consent(db, cid, "id_number")
    await db.commit()
    c = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert c.id_number is None  # 撤回即删除
    states = await consent_service.get_consent_states(db, cid)
    assert next(s for s in states if s["consent_type"] == "id_number")["granted"] is False


async def test_withdraw_privacy_consent_rejected(db):
    cid = await register_contestant(db)
    with pytest.raises(HTTPException, match="注销账号"):
        await consent_service.withdraw_consent(db, cid, "privacy")


async def test_my_data(db, contest):
    cid = await register_contestant(db)
    await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="测试选手", email="a@test.com",
        id_number=VALID_ID_A, id_number_agreed=True, privacy_agreed=True,
    ), contestant_id=cid)
    data = await contestant_service.get_my_data(db, cid)
    assert data["profile"]["id_number"] == "1101****7758"
    assert len(data["registrations"]) == 1
    assert {c["consent_type"] for c in data["consents"]} == {"privacy", "id_number", "guardian_consent", "minor_statement"}


async def test_change_password(db):
    cid = await register_contestant(db)
    with pytest.raises(HTTPException, match="原密码不正确"):
        await contestant_service.change_contestant_password(db, cid, "WrongPass1", "NewPass123")
    await contestant_service.change_contestant_password(db, cid, "Passw0rd", "NewPass123")
    assert await contestant_service.login_contestant(db, "a@test.com", "NewPass123")


# ── 注销 ──────────────────────────────────────────────────────────


async def test_deactivate_anonymizes(db, contest):
    cid = await register_contestant(db)
    await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="测试选手", email="a@test.com",
        id_number=VALID_ID_A, id_number_agreed=True, privacy_agreed=True,
    ), contestant_id=cid)

    original_email = await contestant_service.deactivate_contestant(db, cid, "Passw0rd")
    assert original_email == "a***@test.com"  # 返回脱敏值，不留明文

    c = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert c.deleted_at is not None
    assert c.id_number is None and c.organization is None
    assert c.name == "已注销用户"
    assert c.email == f"deleted_{cid}@deleted.invalid"  # 原邮箱释放

    # 报名记录保留但邮箱已脱敏
    reg = (await db.execute(select(Registration))).scalar_one()
    assert reg.contestant_id == cid
    assert reg.form_data["email"] == "a***@test.com"

    # 原邮箱可再注册
    cid2 = await register_contestant(db, "a@test.com")
    assert cid2 != cid


# ── 系统设置与数据清理 ───────────────────────────────────────────


async def test_settings_defaults_and_update(db):
    items = await settings_service.get_all_settings(db)
    defaults = {i["key"]: i["value"] for i in items}
    assert defaults["registration_retention_days"] == 180
    assert defaults["export_retention_days"] == 1

    await settings_service.update_settings(db, {"export_retention_days": 3})
    assert await settings_service.get_setting_int(db, "export_retention_days") == 3
    with pytest.raises(HTTPException):
        await settings_service.update_settings(db, {"export_retention_days": 0})


async def test_cleanup_purges_and_clears(db, contest):
    import os
    from datetime import datetime, timedelta, timezone
    from app.config import get_settings
    from app.models.export_task import ExportTask
    from app.services.cleanup_service import run_cleanup_once

    # 软删 31 天前的报名 → 物理清除
    old_deleted = Registration(
        contest_id=contest.id, contestant_id=None, group_id=None,
        registration_number="C-old-deleted",
        form_data={"name": "x", "email": "x@t.com"},
        deleted_at=datetime.now(timezone.utc) - timedelta(days=31),
    )
    # 匿名报名 + 已结束很久的赛事 → 证号清除
    from app.models.contest import Contest, ContestStatus
    now = datetime.now()
    ended = Contest(
        creator_id=contest.creator_id, title="已结束赛事",
        start_date=now - timedelta(days=400), end_date=now - timedelta(days=200),
        registration_start=now - timedelta(days=410), registration_end=now - timedelta(days=400),
        status=ContestStatus.finished, timezone="UTC",
    )
    db.add(ended)
    await db.flush()
    anon_reg = Registration(
        contest_id=ended.id, contestant_id=None, group_id=None,
        registration_number="C-anon-old",
        form_data={"name": "y", "email": "y@t.com", "id_number": "encrypted-value"},
    )
    # 过期导出任务 + 磁盘文件 → 删除
    export_dir = get_settings().export_dir
    os.makedirs(export_dir, exist_ok=True)
    file_path = os.path.join(export_dir, "old_export.xlsx")
    with open(file_path, "wb") as f:
        f.write(b"x")
    old_task = ExportTask(id="oldtask1", status="completed", file_path=file_path,
                          filename="old.xlsx",
                          created_at=datetime.now(timezone.utc) - timedelta(days=2))
    db.add_all([old_deleted, anon_reg, old_task])
    await db.commit()

    stats = await run_cleanup_once(db)

    assert stats["purged_registrations"] == 1
    assert stats["cleared_pii_fields"] == 1
    assert stats["deleted_exports"] == 1
    remaining = (await db.execute(select(Registration).where(
        Registration.registration_number == "C-old-deleted"))).scalar_one_or_none()
    assert remaining is None
    anon = (await db.execute(select(Registration).where(
        Registration.registration_number == "C-anon-old"))).scalar_one()
    assert "id_number" not in anon.form_data
    assert not os.path.exists(file_path)


# ── 登录锁定 ─────────────────────────────────────────────────────


async def test_login_guard_lockout(db):
    from unittest.mock import MagicMock
    from app.models.audit_log import AuditLog
    from app.services.login_guard import check_login_allowed

    req = MagicMock()
    req.headers = {}
    req.client.host = "1.2.3.4"

    await check_login_allowed(db, operator="a@test.com", request=req)  # 无记录放行
    for _ in range(5):
        db.add(AuditLog(event_type="contestant_login_failed", operator="a@test.com",
                        ip_address="9.9.9.9", result="fail"))
    await db.commit()
    with pytest.raises(HTTPException) as exc:
        await check_login_allowed(db, operator="a@test.com", request=req)
    assert exc.value.status_code == 429


# ── 导出任务落库 ─────────────────────────────────────────────────


async def test_export_task_persisted(db, contest):
    from app.services import export_service

    cid = await register_contestant(db)
    await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="测试选手", email="a@test.com",
        id_number=VALID_ID_A, id_number_agreed=True, privacy_agreed=True,
    ), contestant_id=cid)

    task_id = await export_service.submit_export_task(
        db, "registration", contest.id, ["registration_number", "name", "id_number"])
    task = await export_service.get_export_task_status(db, task_id)
    assert task["status"] == "completed"
    assert task["file_path"] and task["filename"].endswith(".xlsx")

    import openpyxl
    wb = openpyxl.load_workbook(task["file_path"])
    ws = wb.active
    assert ws.cell(row=2, column=3).value == VALID_ID_A  # 账号侧解析出明文证号


# ── Review 回归测试 ──────────────────────────────────────────────


async def test_deactivated_token_cannot_register(db, contest):
    """注销账号的 token：optional auth 按匿名处理；服务层直接拒绝。"""
    from unittest.mock import MagicMock
    from app.middleware.contestant_auth import get_optional_contestant
    from app.services.contestant_service import create_contestant_token

    cid = await register_contestant(db)
    token = create_contestant_token(cid)
    creds = MagicMock()
    creds.credentials = token

    # 注销前：optional auth 正常返回
    assert (await get_optional_contestant(creds, db)) is not None

    await contestant_service.deactivate_contestant(db, cid, "Passw0rd")

    # 注销后：optional auth 按匿名处理（返回 None）
    assert (await get_optional_contestant(creds, db)) is None

    # 服务层兜底：直接以已注销账号身份报名 → 401
    with pytest.raises(HTTPException) as exc:
        await registration_service.register(db, RegistrationCreate(
            contest_id=contest.id, name="测试选手", email="new@test.com",
            id_number=VALID_ID_B, id_number_agreed=True, privacy_agreed=True,
        ), contestant_id=cid)
    assert exc.value.status_code == 401

    # PII 未复活：账号证号仍为空
    c = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert c.id_number is None


async def test_cleanup_skips_registrations_with_results(db, contest):
    """带成绩的软删报名不物理删除（保护成绩链），清理任务不崩溃。"""
    from datetime import datetime, timedelta, timezone
    from app.models.result import Result
    from app.services.cleanup_service import run_cleanup_once

    reg = Registration(
        contest_id=contest.id, contestant_id=None, group_id=None,
        registration_number="C-with-result",
        form_data={"name": "x", "email": "x@t.com"},
        deleted_at=datetime.now(timezone.utc) - timedelta(days=31),
    )
    db.add(reg)
    await db.flush()
    db.add(Result(contest_id=contest.id, registration_id=reg.id, scores={}, total_score=90))
    await db.commit()

    stats = await run_cleanup_once(db)  # 不应抛 FK 错误
    assert stats["purged_registrations"] == 0
    assert (await db.execute(select(Registration).where(
        Registration.registration_number == "C-with-result"))).scalar_one_or_none() is not None


async def test_deactivate_masks_consent_log_emails(db, contest):
    """注销后历史同意流水中的邮箱被脱敏，不再残留明文。"""
    from app.models.consent_log import ConsentLog

    cid = await register_contestant(db)
    await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="测试选手", email="a@test.com",
        id_number=VALID_ID_A, id_number_agreed=True, privacy_agreed=True,
    ), contestant_id=cid)
    await contestant_service.deactivate_contestant(db, cid, "Passw0rd")

    rows = (await db.execute(select(ConsentLog).where(ConsentLog.contestant_id == cid))).scalars().all()
    assert rows, "应有同意流水"
    for row in rows:
        assert "a@test.com" not in row.email


# ── 邮箱加密存储 ─────────────────────────────────────────────────


async def test_email_encrypted_with_blind_index(db):
    from sqlalchemy import text as sa_text
    from app.utils.crypto import keyed_hash

    cid = await register_contestant(db, "MixedCase@Test.com")
    c = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    # 数据库里不是明文
    assert c.email == "MixedCase@Test.com"  # ORM 读取自动解密
    raw = await db.execute(sa_text("SELECT email, email_hash FROM contestants WHERE id = :id"), {"id": cid})
    raw_email, raw_hash = raw.one()
    assert "@" not in raw_email and raw_email.startswith("gAAAA")  # Fernet 密文
    assert raw_hash == keyed_hash("mixedcase@test.com")  # 归一化后哈希

    # 大小写不同也算重复
    with pytest.raises(HTTPException, match="已注册"):
        await contestant_service.register_contestant(db, make_contestant_payload("mixedcase@test.com"))

    # 登录（不同大小写）正常
    assert await contestant_service.login_contestant(db, "mixedcase@test.com", "Passw0rd")


async def test_profile_email_update_maintains_hash(db):
    cid = await register_contestant(db)
    await contestant_service.update_contestant_profile(db, cid, ContestantProfileUpdate(email="new@test.com"))
    from app.utils.crypto import keyed_hash
    c = (await db.execute(select(Contestant).where(Contestant.id == cid))).scalar_one()
    assert c.email_hash == keyed_hash("new@test.com")
    assert await contestant_service.login_contestant(db, "new@test.com", "Passw0rd")
    # 占用他人邮箱被拒绝
    cid2 = await register_contestant(db, "b@test.com")
    with pytest.raises(HTTPException, match="已被使用"):
        await contestant_service.update_contestant_profile(db, cid2, ContestantProfileUpdate(email="new@test.com"))


# ── 自定义字段敏感信息拦截 ───────────────────────────────────────


async def test_sensitive_custom_field_rejected(db):
    from app.services.contest_service import _validate_custom_fields

    _validate_custom_fields([{"field_name": "兴趣爱好"}])  # 正常字段放行
    for bad in ("健康状况", "民族", "宗教信仰", "身份证号", "银行卡号"):
        with pytest.raises(HTTPException) as exc:
            _validate_custom_fields([{"field_name": bad}])
        assert "敏感个人信息" in exc.value.detail


# ── 审计日志 IP 到期匿名化 ───────────────────────────────────────


async def test_cleanup_masks_old_audit_ips(db):
    from datetime import datetime, timedelta, timezone
    from app.models.audit_log import AuditLog
    from app.services.cleanup_service import run_cleanup_once

    db.add(AuditLog(event_type="login_success", operator="admin", ip_address="10.20.30.40",
                    created_at=datetime.now(timezone.utc) - timedelta(days=200)))
    db.add(AuditLog(event_type="login_success", operator="admin", ip_address="2001:db8:85a3::8a2e:370:7334",
                    created_at=datetime.now(timezone.utc) - timedelta(days=200)))
    db.add(AuditLog(event_type="login_success", operator="admin", ip_address="1.2.3.4"))  # 新日志不动
    await db.commit()

    stats = await run_cleanup_once(db)
    assert stats["masked_audit_ips"] == 2
    rows = (await db.execute(select(AuditLog).order_by(AuditLog.id))).scalars().all()
    assert rows[0].ip_address == "10.20.x.x"
    assert rows[1].ip_address == "2001:db8::"  # IPv6 保留前两段前缀
    assert rows[2].ip_address == "1.2.3.4"


async def test_log_append_only_trigger(db):
    """日志防删改触发器三态：DELETE 禁 / UPDATE 禁 / 维护通道放行。

    测试库由 create_all 建表（不含迁移中的触发器），此处按迁移
    b8c9d0e1f2a3 的 SQL 手动创建——迁移改动时需同步本测试。
    """
    from sqlalchemy import text as sa_text

    await db.execute(sa_text("""
        CREATE OR REPLACE FUNCTION forbid_log_mutation() RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'audit/consent logs are append-only';
            END IF;
            IF current_setting('app.log_maintenance', true) = 'on' THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'audit/consent logs are append-only';
        END;
        $$ LANGUAGE plpgsql;
    """))
    await db.execute(sa_text("""
        CREATE TRIGGER trg_audit_logs_append_only
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION forbid_log_mutation();
    """))
    from app.models.audit_log import AuditLog
    db.add(AuditLog(event_type="t", operator="t", ip_address="1.1.1.1"))
    await db.commit()

    from sqlalchemy.exc import DBAPIError
    with pytest.raises(DBAPIError):
        await db.execute(sa_text("DELETE FROM audit_logs"))
    await db.rollback()
    with pytest.raises(DBAPIError):
        await db.execute(sa_text("UPDATE audit_logs SET operator = 'x'"))
    await db.rollback()

    await db.execute(sa_text("SET LOCAL app.log_maintenance = 'on'"))
    await db.execute(sa_text("UPDATE audit_logs SET ip_address = '1.1.x.x'"))
    await db.commit()
