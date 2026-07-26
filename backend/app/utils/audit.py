"""Audit logging utility for security compliance.

Usage from any API endpoint:
    from app.utils.audit import log_event
    await log_event(db, "export_data", operator="admin", operator_id=1,
                    target="contest/5", target_type="contest",
                    detail={"export_type": "registration", "fields": [...]},
                    result="success", request=request)
"""

from __future__ import annotations
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.utils.request_ip import get_client_ip


async def log_event(
    db: AsyncSession | None,
    event_type: str,
    *,
    operator: str = "",
    operator_id: int | None = None,
    target: str = "",
    target_type: str | None = None,
    detail: dict[str, Any] | None = None,
    result: str = "success",
    ip_address: str = "",
    user_agent: str = "",
    request: Request | None = None,
) -> None:
    """Insert an audit log entry.  Never raises — logging failures must not break the request."""

    if db is None:
        return  # no database session available (e.g. upload validation failure)

    # Auto-extract IP and User-Agent from the request object if available
    if request:
        if not ip_address:
            ip_address = get_client_ip(request)
        if not user_agent:
            user_agent = request.headers.get("User-Agent", "")

    entry = AuditLog(
        event_type=event_type,
        operator=operator,
        operator_id=operator_id,
        target=target,
        target_type=target_type,
        detail=detail or {},
        result=result,
        ip_address=ip_address or "",
        user_agent=user_agent or "",
    )
    db.add(entry)
    try:
        await db.commit()
    except Exception:
        pass  # never let audit logging break the request


async def count_recent_events(
    db: AsyncSession,
    event_type: str,
    *,
    operator: str,
    minutes: int,
) -> int:
    """Count audit events of a type by an operator within the last N minutes."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func, select

    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    result = await db.execute(
        select(func.count(AuditLog.id))
        .where(AuditLog.event_type == event_type)
        .where(AuditLog.operator == operator)
        .where(AuditLog.created_at >= since)
    )
    return result.scalar() or 0
