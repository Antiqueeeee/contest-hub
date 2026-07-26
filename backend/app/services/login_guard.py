"""Login failure lockout based on audit log counts (等保 2.0 身份鉴别 c).

Failure events are already recorded in the audit log by the login
endpoints; this guard counts recent failures before each attempt:

- same account: 5 failures within 15 minutes → locked for 15 minutes
- same IP:      10 failures within 15 minutes → rejected for 15 minutes
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.utils.request_ip import get_client_ip

LOCK_WINDOW_MINUTES = 15
MAX_ACCOUNT_FAILURES = 5
MAX_IP_FAILURES = 10

# Both admin and contestant failure events count toward the IP limit.
FAILED_EVENT_TYPES = ("login_failed", "contestant_login_failed")


async def check_login_allowed(db: AsyncSession, *, operator: str, request: Request) -> None:
    """Raise HTTP 429 if the account or client IP is currently locked out.

    已知取舍：失败后登录成功不会清零计数（窗口内累计）；账号级锁定意味着
    知晓用户名者可制造短时锁定（15 分钟自恢复），这与多数系统的实现一致。
    """
    since = datetime.now(timezone.utc) - timedelta(minutes=LOCK_WINDOW_MINUTES)
    base = (
        select(func.count(AuditLog.id))
        .where(AuditLog.event_type.in_(FAILED_EVENT_TYPES))
        .where(AuditLog.created_at >= since)
    )

    account_failures = await db.execute(base.where(AuditLog.operator == operator))
    if (account_failures.scalar() or 0) >= MAX_ACCOUNT_FAILURES:
        raise HTTPException(
            status_code=429,
            detail=f"登录失败次数过多，账号已锁定，请 {LOCK_WINDOW_MINUTES} 分钟后重试",
        )

    ip = get_client_ip(request)
    if ip:
        ip_failures = await db.execute(base.where(AuditLog.ip_address == ip))
        if (ip_failures.scalar() or 0) >= MAX_IP_FAILURES:
            raise HTTPException(
                status_code=429,
                detail=f"登录失败次数过多，请 {LOCK_WINDOW_MINUTES} 分钟后重试",
            )
