import os
import uuid
from datetime import datetime, timezone
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.config import get_settings
from app.services.registration_service import get_registrations_for_export
from app.services.result_service import list_results

# Chinese field name mapping
FIELD_LABELS = {
    "registration_number": "报名编号",
    "name": "姓名",
    "phone": "手机号",
    "group_id": "组别",
    "group": "组别",
    "submitted_at": "报名时间",
    "total_score": "总分",
    "rank": "排名",
    "award": "奖项",
    "scores": "评分详情",
}

# In-memory export task store
_export_tasks: dict[str, dict] = {}

thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin'),
)
header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
header_font = Font(name="微软雅黑", size=11, bold=True, color="FFFFFF")
body_font = Font(name="微软雅黑", size=10)
center_align = Alignment(horizontal="center", vertical="center")


async def submit_export_task(
    db: AsyncSession, export_type: str, contest_id: int, field_names: list[str],
    group_ids: list[int] | None = None,
) -> str:
    settings = get_settings()
    task_id = str(uuid.uuid4())[:8]
    _export_tasks[task_id] = {"status": "processing", "file_path": None, "created_at": datetime.now(timezone.utc)}

    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "报名数据" if export_type == "registration" else "成绩数据"

        if export_type == "registration":
            rows = await get_registrations_for_export(db, contest_id, group_ids)
            if not field_names:
                field_names = ["registration_number", "name", "phone", "group_id", "submitted_at"]

            # Header
            for col, name in enumerate(field_names, 1):
                label = FIELD_LABELS.get(name, name)
                cell = ws.cell(row=1, column=col, value=label)
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = center_align
                cell.border = thin_border

            for row_idx, reg in enumerate(rows, 2):
                form_data = reg.form_data or {}
                for col_idx, name in enumerate(field_names, 1):
                    if name == "registration_number":
                        val = reg.registration_number
                    elif name == "name":
                        val = form_data.get("name", "")
                    elif name == "phone":
                        val = form_data.get("phone", "")
                    elif name == "group_id":
                        val = str(reg.group_id) if reg.group_id else ""
                    elif name == "submitted_at":
                        val = reg.submitted_at.strftime("%Y-%m-%d %H:%M") if reg.submitted_at else ""
                    else:
                        val = form_data.get(name, "")
                    cell = ws.cell(row=row_idx, column=col_idx, value=str(val) if val is not None else "")
                    cell.font = body_font
                    cell.border = thin_border

        else:  # result
            items, _ = await list_results(db, contest_id=contest_id, page=1, page_size=settings.export_max_rows)
            if not field_names:
                field_names = ["registration_number", "name", "phone", "group", "total_score", "rank", "award"]

            for col, name in enumerate(field_names, 1):
                label = FIELD_LABELS.get(name, name)
                cell = ws.cell(row=1, column=col, value=label)
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = center_align
                cell.border = thin_border

            from app.services.registration_service import get_registration
            for row_idx, r in enumerate(items, 2):
                try:
                    reg = await get_registration(db, r.registration_id)
                    form_data = reg.form_data or {}
                except Exception:
                    form_data = {}
                for col_idx, name in enumerate(field_names, 1):
                    if name == "registration_number":
                        val = getattr(r, 'registration_number', '') if hasattr(r, 'registration_number') else ''
                        if not val and hasattr(r, 'registration'):
                            val = r.registration.registration_number if r.registration else ''
                    elif name == "name":
                        val = form_data.get("name", "")
                    elif name == "phone":
                        val = form_data.get("phone", "")
                    elif name == "group":
                        val = ""
                    elif name == "total_score":
                        val = str(r.total_score)
                    elif name == "rank":
                        val = str(r.rank) if r.rank else ""
                    elif name == "award":
                        val = ""
                    else:
                        val = str(r.scores.get(name, "")) if r.scores else ""
                    cell = ws.cell(row=row_idx, column=col_idx, value=str(val) if val is not None else "")
                    cell.font = body_font
                    cell.border = thin_border

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = 0
            for cell in col:
                try:
                    if cell.value:
                        max_len = max(max_len, len(str(cell.value)))
                except Exception:
                    pass
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 50)

        # Save
        os.makedirs(settings.export_dir, exist_ok=True)
        filename = f"export_{task_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.xlsx"
        file_path = os.path.join(settings.export_dir, filename)
        wb.save(file_path)

        _export_tasks[task_id] = {"status": "completed", "file_path": file_path, "created_at": _export_tasks[task_id]["created_at"]}

    except Exception as e:
        _export_tasks[task_id] = {"status": "failed", "file_path": None, "error": str(e), "created_at": _export_tasks[task_id]["created_at"]}

    return task_id


def get_export_task_status(task_id: str) -> dict | None:
    return _export_tasks.get(task_id)
