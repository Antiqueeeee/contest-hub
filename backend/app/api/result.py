import io
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from openpyxl import load_workbook

from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.result import ResultCreate, ResultOut, ResultQueryRequest
from app.services import result_service

admin_router = APIRouter(prefix="/api/admin/results", tags=["成绩管理"])
public_router = APIRouter(prefix="/api/public/contests", tags=["前台成绩"])


@admin_router.get("", response_model=dict)
async def list_results(
    contest_id: int | None = Query(default=None),
    group_id: int | None = Query(default=None),
    is_published: bool | None = Query(default=None),
    keyword: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    items, total = await result_service.list_results(db, contest_id, group_id, is_published, keyword, page, page_size)
    return {
        "items": [
            {
                **ResultOut.model_validate(r).model_dump(),
                "registration_number": r.registration.registration_number if r.registration else "",
                "contestant_name": r.registration.form_data.get("name", "") if r.registration else "",
            }
            for r in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@admin_router.get("/template")
async def download_template(
    contest_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    from app.models.contest import Contest
    from app.models.registration import Registration
    from sqlalchemy import select as sa_select

    r = await db.execute(sa_select(Contest).where(Contest.id == contest_id))
    contest = r.scalar_one_or_none()
    cats = contest.score_categories if contest and contest.score_categories else ["客观题得分", "主观题得分"]

    # Get registrations
    regs_r = await db.execute(
        sa_select(Registration).where(Registration.contest_id == contest_id, Registration.deleted_at.is_(None))
        .order_by(Registration.submitted_at)
    )
    registrations = list(regs_r.scalars().all())

    wb = Workbook()
    ws = wb.active
    ws.title = "成绩导入模板"

    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    clean_cats = [c for c in cats if c.strip()]
    headers = ["报名编号", "姓名"] + clean_cats + ["总分", "排名", "奖项"]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.fill = header_fill
        cell.font = header_font

    # Pre-fill registration numbers and names
    for row_idx, reg in enumerate(registrations, 2):
        ws.cell(row=row_idx, column=1, value=reg.registration_number)
        ws.cell(row=row_idx, column=2, value=reg.form_data.get("name", ""))

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    from urllib.parse import quote
    safe_title = contest.title.replace('/', '_').replace('\\', '_') if contest else f"赛事{contest_id}"
    filename = f"{safe_title}_成绩导入模板.xlsx"
    encoded = quote(filename)
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"})


@admin_router.post("/import")
async def import_results(
    contest_id: int = Query(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="请上传 .xlsx 格式文件")

    contents = await file.read()
    wb = load_workbook(io.BytesIO(contents))
    ws = wb.active

    # Read header row
    headers = [str(cell.value).strip() if cell.value else "" for cell in ws[1]]
    # Columns: 报名编号 | 姓名 | [score categories ...] | 总分 | 排名 | 奖项
    non_score = {"报名编号", "姓名", "总分", "排名", "奖项"}
    score_cols = []
    total_col = -1
    rank_col = -1
    award_col = -1
    for i, h in enumerate(headers):
        if h == "总分": total_col = i
        elif h == "排名": rank_col = i
        elif h == "奖项": award_col = i
        elif h not in non_score:
            score_cols.append((i, h))

    success_count = 0
    errors = []

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
        if not row[0]:
            continue
        reg_number = str(row[0]).strip()
        try:
            from sqlalchemy import select
            from app.models.registration import Registration
            r = await db.execute(select(Registration).where(Registration.registration_number == reg_number, Registration.deleted_at.is_(None)))
            reg = r.scalar_one_or_none()
            if not reg:
                errors.append({"row": row_idx, "error": f"报名编号 {reg_number} 不存在"})
                continue

            scores = {}
            for col_idx, col_name in score_cols:
                if len(row) > col_idx and row[col_idx] is not None:
                    scores[col_name] = float(row[col_idx])

            total = float(row[total_col]) if total_col >= 0 and len(row) > total_col and row[total_col] is not None else sum(scores.values())
            rank = int(row[rank_col]) if rank_col >= 0 and len(row) > rank_col and row[rank_col] is not None else None
            award_name = str(row[award_col]).strip() if award_col >= 0 and len(row) > award_col and row[award_col] is not None else None

            award_id = None
            if award_name:
                from app.models.contest import Award
                a = await db.execute(select(Award).where(Award.contest_id == contest_id, Award.name == award_name))
                award = a.scalar_one_or_none()
                if award:
                    award_id = award.id

            data = ResultCreate(
                contest_id=contest_id,
                registration_id=reg.id,
                scores=scores,
                total_score=total,
                rank=rank,
                award_id=award_id,
            )
            await result_service.create_or_update_result(db, data)
            success_count += 1
        except Exception as e:
            errors.append({"row": row_idx, "error": str(e)})

    return {"success_count": success_count, "error_count": len(errors), "errors": errors[:20]}


@admin_router.post("", response_model=ResultOut)
async def create_result(data: ResultCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await result_service.create_or_update_result(db, data)


@admin_router.patch("/{result_id}/publish")
async def publish_result(result_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    await result_service.publish_result(db, result_id)
    return {"message": "成绩已发布"}


@admin_router.patch("/{result_id}/withdraw")
async def withdraw_result(result_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    await result_service.withdraw_result(db, result_id)
    return {"message": "成绩已撤回"}


# --- Public ---

@public_router.post("/{contest_id}/query-result")
async def query_result(contest_id: int, data: ResultQueryRequest, db: AsyncSession = Depends(get_db)):
    result = await result_service.query_result_public(db, contest_id, data.registration_number, data.email)
    if not result:
        raise HTTPException(status_code=404, detail="未查询到成绩，请检查报名编号和手机号是否正确")
    return result
