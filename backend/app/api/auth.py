from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserUpdate, UserOut
from app.services import auth_service
from app.utils.audit import log_event

router = APIRouter(prefix="/api/auth", tags=["认证"])
admin_router = APIRouter(prefix="/api/admin/users", tags=["管理员管理"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        result = await auth_service.authenticate(db, req)
        await log_event(db, "login_success", operator=req.username, operator_id=result["user"]["id"],
                        result="success", request=request)
        return result
    except Exception:
        await log_event(db, "login_failed", operator=req.username, result="fail", request=request)
        raise


@router.post("/logout")
async def logout(request: Request):
    return {"message": "已退出登录"}


@admin_router.get("", response_model=dict)
async def list_users(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    users = await auth_service.list_users(db)
    return {"items": [UserOut.model_validate(u).model_dump() for u in users], "total": len(users)}


@admin_router.post("", response_model=UserOut)
async def create_user(data: UserCreate, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = await auth_service.create_user(db, data)
    await log_event(db, "create_admin", operator=current_user["username"], operator_id=current_user["user_id"],
                    target=user.username, target_type="user", detail={"name": data.name}, result="success", request=request)
    return user


@admin_router.put("/{user_id}", response_model=UserOut)
async def update_user(user_id: int, data: UserUpdate, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = await auth_service.update_user(db, user_id, data)
    await log_event(db, "update_admin", operator=current_user["username"], operator_id=current_user["user_id"],
                    target=user.username, target_type="user", result="success", request=request)
    return user


@admin_router.patch("/{user_id}/status")
async def toggle_status(user_id: int, request: Request, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = await auth_service.toggle_user_status(db, user_id, current_user["user_id"])
    await log_event(db, "toggle_admin_status", operator=current_user["username"], operator_id=current_user["user_id"],
                    target=user.username, target_type="user", detail={"new_status": user.status.value}, result="success", request=request)
    return {"message": "状态已更新", "status": user.status.value}

