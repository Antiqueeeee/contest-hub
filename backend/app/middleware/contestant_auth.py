from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import get_settings

security = HTTPBearer()


async def get_current_contestant(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    settings = get_settings()
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "contestant":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的选手认证令牌")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")
        return {"contestant_id": int(user_id_str), "email": payload.get("email", "")}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的认证令牌")


async def get_optional_contestant(credentials: HTTPAuthorizationCredentials | None = Depends(
    HTTPBearer(auto_error=False)
)) -> dict | None:
    """Optional auth - returns contestant info if token present, None otherwise."""
    if not credentials:
        return None
    try:
        settings = get_settings()
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "contestant":
            return None
        return {"contestant_id": int(payload.get("sub")), "email": payload.get("email", "")}
    except JWTError:
        return None
