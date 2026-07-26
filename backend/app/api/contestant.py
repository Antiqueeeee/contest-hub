from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.contestant_auth import get_current_contestant
from app.schemas.contestant import ContestantRegister, ContestantLogin, ContestantProfileUpdate, DeactivateRequest
from app.schemas.user import PasswordChange
from app.services import contestant_service, consent_service
from app.services.login_guard import check_login_allowed
from app.utils.crypto import mask_id_number
from app.utils.audit import log_event
from app.utils.rate_limit import rate_limit

router = APIRouter(prefix="/api", tags=["选手"])


@router.post("/auth/contestant/register",
             dependencies=[Depends(rate_limit("contestant_register", max_requests=10, window_seconds=60))])
async def register(data: ContestantRegister, request: Request, db: AsyncSession = Depends(get_db)):
    result = await contestant_service.register_contestant(db, data)
    await consent_service.record_consent(
        db, consent_type="privacy", action="granted",
        contestant_id=result["user"]["id"], email=data.email, request=request,
    )
    await db.commit()
    await log_event(db, "contestant_register", operator=data.email, operator_id=result["user"]["id"],
                    result="success", request=request)
    return result


@router.post("/auth/contestant/login",
             dependencies=[Depends(rate_limit("contestant_login", max_requests=10, window_seconds=60))])
async def login(data: ContestantLogin, request: Request, db: AsyncSession = Depends(get_db)):
    await check_login_allowed(db, operator=data.email, request=request)
    try:
        result = await contestant_service.login_contestant(db, data.email, data.password)
        await log_event(db, "contestant_login_success", operator=data.email, operator_id=result["user"]["id"],
                        result="success", request=request)
        return result
    except HTTPException:
        await log_event(db, "contestant_login_failed", operator=data.email, result="fail", request=request)
        raise


@router.get("/contestant/profile")
async def get_profile(current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    c = await contestant_service.get_contestant_profile(db, current["contestant_id"])
    return {"id": c.id, "name": c.name, "email": c.email,
            "id_number": mask_id_number(c.id_number), "organization": c.organization}


@router.put("/contestant/profile",
            dependencies=[Depends(rate_limit("profile_update", max_requests=10, window_seconds=60))])
async def update_profile(data: ContestantProfileUpdate, current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    c = await contestant_service.update_contestant_profile(db, current["contestant_id"], data)
    return {"id": c.id, "name": c.name, "email": c.email,
            "id_number": mask_id_number(c.id_number), "organization": c.organization}


@router.get("/contestant/registrations")
async def my_registrations(current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    items = await contestant_service.get_my_registrations(db, current["contestant_id"])
    return {"items": items}


@router.get("/contestant/results")
async def my_results(current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    items = await contestant_service.get_my_results(db, current["contestant_id"])
    return {"items": items}


@router.get("/contestant/results/{contest_id}")
async def my_contest_result(contest_id: int, current: dict = Depends(get_current_contestant), db: AsyncSession = Depends(get_db)):
    """Get the logged-in contestant's result for a specific contest."""
    from sqlalchemy import select
    from app.models.registration import Registration
    from app.models.result import Result
    from app.models.contest import Contest
    from app.services.result_service import lookup_award_name

    # Find registration for this contestant + contest
    r = await db.execute(
        select(Registration).where(
            Registration.contestant_id == current["contestant_id"],
            Registration.contest_id == contest_id,
            Registration.deleted_at.is_(None),
        )
    )
    reg = r.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="未找到您在该赛事的报名记录")

    # Find published result
    rr = await db.execute(
        select(Result).where(Result.registration_id == reg.id, Result.is_published == True)
    )
    result = rr.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="成绩尚未发布")

    # Get contest title
    ct = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = ct.scalar_one_or_none()

    award_name = await lookup_award_name(db, result.award_id)

    return {
        "contest_title": contest.title if contest else "",
        "registration_number": reg.registration_number,
        "name": reg.form_data.get("name", ""),
        "scores": result.scores,
        "total_score": float(result.total_score),
        "rank": result.rank,
        "award_name": award_name,
    }


@router.post("/contestant/password",
             dependencies=[Depends(rate_limit("contestant_password", max_requests=5, window_seconds=60))])
async def change_password(data: PasswordChange, request: Request,
                          current: dict = Depends(get_current_contestant),
                          db: AsyncSession = Depends(get_db)):
    await contestant_service.change_contestant_password(
        db, current["contestant_id"], data.old_password, data.new_password)
    await log_event(db, "contestant_change_password", operator=str(current["contestant_id"]),
                    operator_id=current["contestant_id"], result="success", request=request)
    return {"message": "密码已更新"}


@router.get("/contestant/my-data")
async def my_data(request: Request, current: dict = Depends(get_current_contestant),
                  db: AsyncSession = Depends(get_db)):
    """查阅/复制个人数据（个保法第 45 条）。身份证号仅返回脱敏值。"""
    data = await contestant_service.get_my_data(db, current["contestant_id"])
    await log_event(db, "contestant_view_my_data", operator=str(current["contestant_id"]),
                    operator_id=current["contestant_id"], result="success", request=request)
    return data


@router.get("/contestant/consents")
async def my_consents(current: dict = Depends(get_current_contestant),
                      db: AsyncSession = Depends(get_db)):
    items = await consent_service.get_consent_states(db, current["contestant_id"])
    return {"items": items}


@router.post("/contestant/consents/{consent_type}/withdraw")
async def withdraw_consent(consent_type: str, request: Request,
                           current: dict = Depends(get_current_contestant),
                           db: AsyncSession = Depends(get_db)):
    await consent_service.withdraw_consent(db, current["contestant_id"], consent_type, request)
    await db.commit()
    await log_event(db, "contestant_withdraw_consent", operator=str(current["contestant_id"]),
                    operator_id=current["contestant_id"], target=consent_type,
                    target_type="consent", result="success", request=request)
    return {"message": "已撤回同意"}


@router.post("/contestant/deactivate",
             dependencies=[Depends(rate_limit("contestant_deactivate", max_requests=5, window_seconds=60))])
async def deactivate(data: DeactivateRequest, request: Request,
                     current: dict = Depends(get_current_contestant),
                     db: AsyncSession = Depends(get_db)):
    """自助注销账号（个保法第 47 条）。注销后 token 立即失效（middleware 查 deleted_at）。"""
    cid = current["contestant_id"]
    masked_email = await contestant_service.deactivate_contestant(db, cid, data.password)
    # 注销视为同时撤回全部同意（邮箱脱敏记录，不留明文）
    for ctype in consent_service.CONSENT_TYPES:
        await consent_service.record_consent(
            db, consent_type=ctype, action="withdrawn",
            contestant_id=cid, email=masked_email, request=request,
        )
    await db.commit()
    await log_event(db, "contestant_deactivate", operator=masked_email, operator_id=cid,
                    result="success", request=request)
    return {"message": "账号已注销，相关个人信息已清除"}
