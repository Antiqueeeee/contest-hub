"""管理端认证守卫测试（2026-08 审查修复）。

选手 token 与管理端用同一 secret 签发，get_current_user 必须拒绝
type=="contestant" 的 token，否则注册选手可写站点内容并在公开页面
执行存储型 XSS。
"""


async def test_contestant_token_rejected_on_admin_endpoint(db):
    import httpx
    from httpx import ASGITransport

    from app.database import engine
    from app.main import app
    from app.schemas.contestant import ContestantRegister
    from app.services.contestant_service import create_contestant_token, register_contestant

    result = await register_contestant(
        db, ContestantRegister(email="guard@test.com", password="Passw0rd!", name="测试选手", privacy_agreed=True))
    token = create_contestant_token(result["user"]["id"])

    # 全局引擎连接池可能复用先前用例事件循环的连接（asyncpg 跨 loop 会报错），
    # 测试前后都 dispose，保证本用例在干净连接上运行、也不影响后续用例
    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"Authorization": f"Bearer {token}"}
            r = await client.put("/api/admin/site-content/contact",
                                 json={"content": "<img src=x onerror=alert(1)>"}, headers=headers)
            assert r.status_code == 401
            # 恶意内容未被写入（公开接口仍返回原值/空值）
            r2 = await client.get("/api/public/site-content/contact")
            assert "<img" not in r2.json()["content"]
    finally:
        await engine.dispose()


async def test_admin_token_still_accepted(db):
    import httpx
    from httpx import ASGITransport

    from app.database import engine
    from app.main import app
    from app.models.user import User
    from app.services.auth_service import create_access_token, hash_password

    admin = User(username="guard_admin", password_hash=hash_password("Admin123!"), name="管理员", phone="")
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    token = create_access_token(admin.id, admin.username)

    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get("/api/admin/site-content/contact",
                                 headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 200
    finally:
        await engine.dispose()


async def test_token_without_type_rejected(db):
    """伪造 token 回归测试：用已知密钥签发、缺失 type claim 的 token 必须被拒。

    扫描器 vuln-0002 的利用方式：管理端 token 无 type 字段，中间件曾只拒绝
    type=="contestant"。现在要求显式 type=="admin"。
    """
    import httpx
    from datetime import datetime, timedelta, timezone
    from httpx import ASGITransport
    from jose import jwt

    from app.config import get_settings
    from app.database import engine
    from app.main import app

    settings = get_settings()
    exp = datetime.now(timezone.utc) + timedelta(minutes=5)
    forged = jwt.encode(
        {"sub": "99999", "username": "admin", "exp": exp},
        settings.jwt_secret, algorithm="HS256",
    )

    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get("/api/admin/users",
                                 headers={"Authorization": f"Bearer {forged}"})
            assert r.status_code == 401
    finally:
        await engine.dispose()


async def test_disabled_admin_token_rejected(db):
    """禁用账号回归测试：禁用后未过期 token 必须立即失效（vuln-0025）。"""
    import httpx
    from httpx import ASGITransport

    from app.database import engine
    from app.main import app
    from app.models.user import User, UserStatus
    from app.services.auth_service import create_access_token, hash_password

    admin = User(username="disabled_guard", password_hash=hash_password("Admin123!"),
                 name="管理员", phone="")
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    token = create_access_token(admin.id, admin.username)
    admin.status = UserStatus.disabled
    await db.commit()

    await engine.dispose()
    try:
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.get("/api/admin/site-content/contact",
                                 headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 401
    finally:
        await engine.dispose()
