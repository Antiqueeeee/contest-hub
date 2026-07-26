from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.contestant import Contestant

security = HTTPBearer()


def _decode_contestant_id(token: str) -> int | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "contestant":
            return None
        user_id_str = payload.get("sub")
        return int(user_id_str) if user_id_str else None
    except JWTError:
        return None


async def get_current_contestant(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    contestant_id = _decode_contestant_id(credentials.credentials)
    if contestant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")
    # 注销账号的 token 立即失效（deleted_at 置位即拒绝）
    row = (await db.execute(select(Contestant.deleted_at).where(Contestant.id == contestant_id))).first()
    if row is None or row[0] is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号已注销或不存在")
    return {"contestant_id": contestant_id}


async def get_optional_contestant(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> dict | None:
    """Optional auth - returns contestant info if token present, None otherwise.

    已注销账号按匿名处理（返回 None），防止注销 token 继续以账号身份操作。
    """
    if not credentials:
        return None
    contestant_id = _decode_contestant_id(credentials.credentials)
    if contestant_id is None:
        return None
    row = (await db.execute(select(Contestant.deleted_at).where(Contestant.id == contestant_id))).first()
    if row is None or row[0] is not None:
        return None
    return {"contestant_id": contestant_id}
