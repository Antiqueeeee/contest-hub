"""Create initial admin user and sample data."""
import asyncio
from sqlalchemy import select
from app.database import async_session, init_db
from app.models.user import User
from app.services.auth_service import hash_password


async def seed():
    await init_db()
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if admin:
            admin.password_hash = hash_password("admin123")
            await db.commit()
            print("Admin password reset to: admin123")
        else:
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                name="系统管理员",
                phone="13800000000",
            )
            db.add(admin)
            await db.commit()
            print("Created admin user: admin / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
