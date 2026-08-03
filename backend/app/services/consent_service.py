"""Consent recording and withdrawal (个保法第 14/15/30 条).

每次授予/撤回写一条 consent_logs 流水，最新一条决定当前状态；
记录政策版本与 IP，用于平台侧举证。
"""

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent_log import ConsentLog
from app.utils.request_ip import get_client_ip

# 隐私政策内容更新时应递增，历史同意按版本可追溯
PRIVACY_POLICY_VERSION = "2026-08-03"

# privacy = 隐私政策；id_number = 身份证号（敏感个人信息单独同意）；
# guardian_consent = 14 岁以下监护人同意（未成年人保护模块）；
# minor_statement = 14-18 岁「已满 14 周岁」本人声明
CONSENT_TYPES = ("privacy", "id_number", "guardian_consent", "minor_statement")


async def record_consent(
    db: AsyncSession,
    *,
    consent_type: str,
    action: str,
    contestant_id: int | None = None,
    email: str = "",
    request: Request | None = None,
) -> None:
    """Append a consent log entry.  Caller is responsible for commit."""
    db.add(ConsentLog(
        contestant_id=contestant_id,
        email=email,
        consent_type=consent_type,
        action=action,
        policy_version=PRIVACY_POLICY_VERSION,
        ip_address=get_client_ip(request) if request else "",
    ))


async def get_consent_states(db: AsyncSession, contestant_id: int) -> list[dict]:
    """Return the latest state of each consent type for a contestant."""
    rows = (await db.execute(
        select(ConsentLog)
        .where(ConsentLog.contestant_id == contestant_id)
        .order_by(ConsentLog.created_at.asc(), ConsentLog.id.asc())
    )).scalars().all()

    latest: dict[str, ConsentLog] = {}
    for row in rows:
        latest[row.consent_type] = row

    return [
        {
            "consent_type": ctype,
            "granted": (latest[ctype].action == "granted") if ctype in latest else False,
            "updated_at": latest[ctype].created_at.isoformat() if ctype in latest else None,
            "policy_version": latest[ctype].policy_version if ctype in latest else None,
        }
        for ctype in CONSENT_TYPES
    ]


async def withdraw_consent(db: AsyncSession, contestant_id: int, consent_type: str,
                           request: Request | None = None) -> None:
    """Withdraw a consent.  Caller is responsible for commit.

    - id_number：撤回即解绑身份证号（账号上的密文置空，不可恢复）。
    - guardian_consent / minor_statement：撤回即删除已收集的出生日期与
      监护人信息（不可恢复），后续报名面向未成年人的赛事时需重新收集。
    - privacy：隐私政策同意是提供服务的基础，撤回需通过注销账号完成，
      此处拒绝并提示（见端点错误信息）。
    """
    if consent_type not in CONSENT_TYPES:
        raise HTTPException(status_code=400, detail="未知的同意类型")
    if consent_type == "privacy":
        raise HTTPException(
            status_code=400,
            detail="隐私政策同意是平台提供服务的基础，如需撤回请在个人中心注销账号",
        )

    from app.models.contestant import Contestant
    from app.services.contestant_service import get_contestant_profile

    c = await get_contestant_profile(db, contestant_id)
    if consent_type == "id_number":
        c.id_number = None  # 撤回敏感信息同意 = 删除已收集的身份证号
    elif consent_type in ("guardian_consent", "minor_statement"):
        c.birth_date = None
        c.guardian_name = None
        c.guardian_contact = None
    await record_consent(
        db, consent_type=consent_type, action="withdrawn",
        contestant_id=contestant_id, email=c.email, request=request,
    )
