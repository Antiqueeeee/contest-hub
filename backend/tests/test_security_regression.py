"""安全修复回归测试（2026-08 扫描：vuln-0001 公式注入 / vuln-0022 mass assignment）。"""

from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException

from app.models.contest import Contest, ContestStatus
from app.models.user import User
from app.schemas.registration import RegistrationCreate
from app.services import registration_service
from app.services.auth_service import hash_password
from app.utils.crypto import decrypt_value

from .conftest import make_id_number


async def _make_open_contest(db):
    admin = User(username="sec_admin", password_hash=hash_password("Admin123"), name="管理员", phone="")
    db.add(admin)
    await db.flush()
    now = datetime.now()
    c = Contest(
        creator_id=admin.id, title="安全回归测试赛事",
        start_date=now, end_date=now + timedelta(days=30),
        registration_start=now - timedelta(days=1),
        registration_end=now + timedelta(days=10),
        status=ContestStatus.open, timezone="UTC",
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


async def _register(db, contest, id_number, email, custom_fields=None):
    return await registration_service.register(db, RegistrationCreate(
        contest_id=contest.id, name="安全测试选手", email=email, id_number=id_number,
        id_number_agreed=True, privacy_agreed=True,
        organization="测试学校", custom_fields=custom_fields or {},
    ))


async def test_custom_fields_cannot_override_reserved(db):
    """vuln-0022 回归：custom_fields 中的保留键被剥离，加密 PII 与去重不受影响。"""
    c = await _make_open_contest(db)
    id_number = make_id_number("1990-01-01")
    reg = await _register(db, c, id_number, "sec@test.com", custom_fields={
        "id_number": "PLAINTEXT-ATTACKER-CONTROLLED-ID",
        "email": "attacker@evil.com",
        "name": "被篡改姓名",
        "birth_date": "1999-12-31",
        "organization": "被篡改学校",
        "school_class": "三年级二班",  # 合法自定义字段保留
    })
    form = reg.form_data
    # 保留键未被覆写：id_number 仍为可解密的密文，name/email/organization 保持权威值
    assert decrypt_value(form["id_number"]) == id_number
    assert form["name"] == "安全测试选手"
    assert form["email"] == "sec@test.com"
    assert form["organization"] == "测试学校"
    assert "birth_date" not in form
    # 合法自定义字段保留
    assert form["school_class"] == "三年级二班"
    # 去重仍然生效：同一身份证再次报名（即使 custom_fields 再塞其他明文）被拒
    with pytest.raises(HTTPException) as exc:
        await _register(db, c, id_number, "sec2@test.com",
                        custom_fields={"id_number": "OTHER-PLAINTEXT"})
    assert "已在此赛事此组别报名" in exc.value.detail


def test_export_cell_formula_escaping():
    """vuln-0001 回归：公式/DDE 前缀的单元格值统一加单引号转义。"""
    from app.services.export_service import _safe_cell_value

    assert _safe_cell_value("=2+3") == "'=2+3"
    assert _safe_cell_value("=HYPERLINK(\"http://x/\",\"x\")") == "'=HYPERLINK(\"http://x/\",\"x\")"
    assert _safe_cell_value("+1+1") == "'+1+1"
    assert _safe_cell_value("-1+1") == "'-1+1"
    assert _safe_cell_value("@SUM(1,1)") == "'@SUM(1,1)"
    assert _safe_cell_value("\tcmd") == "'\tcmd"
    assert _safe_cell_value("\rX") == "'\rX"
    assert _safe_cell_value("正常文本") == "正常文本"
    assert _safe_cell_value(None) == ""
    assert _safe_cell_value(123) == "123"
