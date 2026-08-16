from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User, UserStatus

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security),
                           db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")
    # 管理端 token 必须显式携带 "type": "admin"：选手 token（"type": "contestant"）
    # 及任何缺失/未知类型的 token 一律拒绝，防止共享密钥下的跨命名空间冒用。
    if payload.get("type") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")
    user_id_str = payload.get("sub")
    try:
        user_id = int(user_id_str) if user_id_str else 0
    except (TypeError, ValueError):
        user_id = 0
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")
    # 每次请求回查用户表：账号被禁用/删除后，未过期 token 立即失效。
    # 只取认证所需三列，避免加载加密 phone 列（每请求解密开销/密钥不匹配时 500）。
    result = await db.execute(
        select(User.id, User.username, User.status).where(User.id == user_id)
    )
    row = result.first()
    if row is None or row.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")
    return {"user_id": row.id, "username": row.username}
