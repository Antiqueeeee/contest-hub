"""Create an open contest with a live registration window for dynamic testing."""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import async_session
from app.models.contest import Contest, ContestStatus, MinorPolicy
from app.models.user import User


async def main() -> None:
    now_utc = datetime.now(timezone.utc)
    shanghai = timezone(timedelta(hours=8))
    now_local = now_utc.astimezone(shanghai).replace(tzinfo=None)

    contest_start = now_local + timedelta(days=7)
    contest_end = now_local + timedelta(days=60)
    reg_start = now_local - timedelta(days=1)
    reg_end = now_local + timedelta(days=30)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if admin is None:
            raise SystemExit("admin user not found; run seed.py first")

        contest = Contest(
            creator_id=admin.id,
            title="动态测试公开赛事",
            description="用于安全动态测试的公开赛事，报名窗口已开启。",
            cover_image="",
            location="石家庄",
            start_date=contest_start,
            end_date=contest_end,
            registration_start=reg_start,
            registration_end=reg_end,
            max_participants=100,
            score_categories=["客观题得分", "主观题得分"],
            status=ContestStatus.open,
            minor_policy=MinorPolicy.normal,
            timezone="Asia/Shanghai",
        )
        db.add(contest)
        await db.commit()
        await db.refresh(contest)
        print(f"created contest id={contest.id} title={contest.title!r} status={contest.status.value}")
        print(f"registration window: {reg_start} .. {reg_end} (Asia/Shanghai)")


if __name__ == "__main__":
    asyncio.run(main())