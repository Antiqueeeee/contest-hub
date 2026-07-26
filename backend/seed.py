"""Create initial admin user (or reset its password with --reset-admin)."""
import asyncio
import secrets
import string
import sys

from sqlalchemy import select
from app.database import async_session, init_db
from app.models.user import User
from app.services.auth_service import hash_password
from app.utils.validators import validate_password_strength


def _gen_password() -> str:
    """生成满足复杂度策略的随机初始密码（16 位，含字母/数字/符号）。"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(16))
        try:
            validate_password_strength(pwd)
            return pwd
        except ValueError:
            continue


async def seed():
    # 容器每次启动都会执行本脚本（见 docker-entrypoint.sh），因此只在
    # admin 不存在时创建；重置密码必须显式加 --reset-admin，避免冲掉
    # 管理员已通过后台修改的密码。
    reset = "--reset-admin" in sys.argv
    await init_db()
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if admin and not reset:
            print("管理员账号已存在，跳过（重置密码请运行: python seed.py --reset-admin）")
            return
        password = _gen_password()
        if admin:
            admin.password_hash = hash_password(password)
            await db.commit()
            print(f"管理员密码已重置: admin / {password}")
        else:
            admin = User(
                username="admin",
                password_hash=hash_password(password),
                name="系统管理员",
                phone="13800000000",
            )
            db.add(admin)
            await db.commit()
            print(f"已创建管理员账号: admin / {password}")
        print("请立即登录后台修改密码（顶部「修改密码」入口）。初始密码仅显示在容器日志中：")
        print("  docker compose logs backend | grep 管理员")


if __name__ == "__main__":
    asyncio.run(seed())

