"""注册开关测试（后台可关闭选手注册）。

默认开放（行不存在视为开启）；关闭后注册接口 403；重开后恢复。
"""

from sqlalchemy import select

from app.models.system_setting import SystemSetting
from app.services import settings_service


async def _set_registration(db, on: bool):
    """幂等：重复调用只更新值，不重复插入。"""
    row = (await db.execute(select(SystemSetting).where(
        SystemSetting.key == settings_service.REGISTRATION_ENABLED_KEY,
    ))).scalar_one_or_none()
    if row:
        row.value = "on" if on else "off"
    else:
        db.add(SystemSetting(key=settings_service.REGISTRATION_ENABLED_KEY, value="on" if on else "off"))
    await db.commit()


async def test_default_enabled_when_row_absent(db):
    assert await settings_service.get_registration_enabled(db) is True


async def test_register_blocked_when_disabled(db):
    import httpx
    from httpx import ASGITransport

    from app.database import engine
    from app.main import app

    payload = {"email": "switch@test.com", "password": "Passw0rd!", "name": "测试选手", "privacy_agreed": True}
    transport = ASGITransport(app=app)

    # 全局引擎连接池可能复用先前用例事件循环的连接（asyncpg 跨 loop 会报错），
    # 测试前后都 dispose，保证本用例在干净连接上运行、也不影响后续用例
    await engine.dispose()
    try:
        # 默认开放：注册成功
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.post("/api/auth/contestant/register", json=payload)
            assert r.status_code == 200

        # 关闭后：403 且 detail 正确
        await _set_registration(db, on=False)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.post("/api/auth/contestant/register", json={**payload, "email": "switch2@test.com"})
            assert r.status_code == 403
            assert r.json()["detail"] == "注册功能暂未开放"

        # 重开后恢复
        await _set_registration(db, on=True)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.post("/api/auth/contestant/register", json={**payload, "email": "switch3@test.com"})
            assert r.status_code == 200
    finally:
        await engine.dispose()


async def test_registration_switch_endpoint_roundtrip(db):
    """PUT /api/admin/settings/registration 接口级往返（管理员 token）。"""
    import httpx
    from httpx import ASGITransport

    from app.database import engine
    from app.main import app
    from app.models.user import User
    from app.services.auth_service import create_access_token, hash_password

    admin = User(username="reg_switch_admin", password_hash=hash_password("Admin123!"), name="管理员", phone="")
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    token = create_access_token(admin.id, admin.username)

    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"Authorization": f"Bearer {token}"}
            r = await client.put("/api/admin/settings/registration", json={"enabled": False}, headers=headers)
            assert r.status_code == 200 and r.json()["enabled"] is False
            r2 = await client.get("/api/public/settings/registration")
            assert r2.json()["enabled"] is False
            r3 = await client.put("/api/admin/settings/registration", json={"enabled": True}, headers=headers)
            assert r3.json()["enabled"] is True
    finally:
        await engine.dispose()
