"""Create initial admin user and sample data."""
import asyncio
from sqlalchemy import select
from app.database import async_session, init_db
from app.models.user import User
from app.services.auth_service import hash_password


async def seed():
    await init_db()
    async with async_session() as db:
        # Check if admin exists
        result = await db.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none():
            print("Admin user already exists, skipping seed.")
            return

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
