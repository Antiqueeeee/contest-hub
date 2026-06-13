from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserUpdate, UserOut
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["认证"])
admin_router = APIRouter(prefix="/api/admin/users", tags=["管理员管理"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.authenticate(db, req)


@router.post("/logout")
async def logout():
    return {"message": "已退出登录"}


@admin_router.get("", response_model=dict)
async def list_users(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    users = await auth_service.list_users(db)
    return {"items": [UserOut.model_validate(u).model_dump() for u in users], "total": len(users)}


@admin_router.post("", response_model=UserOut)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await auth_service.create_user(db, data)


@admin_router.put("/{user_id}", response_model=UserOut)
async def update_user(user_id: int, data: UserUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await auth_service.update_user(db, user_id, data)


@admin_router.patch("/{user_id}/status")
async def toggle_status(user_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = await auth_service.toggle_user_status(db, user_id, current_user["user_id"])
    return {"message": "状态已更新", "status": user.status.value}

