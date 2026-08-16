import os
import uuid
import io
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, Request
from app.config import get_settings
from app.middleware.auth import get_current_user
from app.utils.audit import log_event

router = APIRouter(prefix="/api/admin/upload", tags=["文件上传"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _detect_image_format(header: bytes) -> str | None:
    """Detect image format from magic bytes (imghdr was removed in Python 3.13)."""
    try:
        from PIL import Image
        with Image.open(io.BytesIO(header)) as img:
            fmt = img.format
        if fmt:
            return fmt.lower()
    except Exception:
        pass

    if header.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if header[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "webp"
    return None


def _validate_image(file: UploadFile) -> None:
    """Validate uploaded file is a real image (ext + magic bytes + content)."""
    settings = get_settings()
    max_bytes = settings.upload_max_size_mb * 1024 * 1024

    # 1. Extension whitelist
    ext = os.path.splitext(file.filename or ".unknown")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支持的文件类型 {ext}，允许：{', '.join(sorted(ALLOWED_EXTENSIONS))}")

    # 2. MIME type whitelist (server-side, not trusting client)
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"不支持的 MIME 类型：{file.content_type}")

    # 3. Read first 2KB to check magic bytes
    header = file.file.read(2048)
    file.file.seek(0)
    detected = _detect_image_format(header)
    if detected is None:
        raise HTTPException(400, "无法识别图片格式，请上传有效的图片文件")
    if f"image/{detected}" not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"不支持的图片格式：{detected}")

    # 4. Verify with Pillow (integrity check, also catches polyglot attacks)
    try:
        from PIL import Image
        img = Image.open(file.file)
        img.verify()
        file.file.seek(0)
    except Exception:
        raise HTTPException(400, "图片文件损坏或无效，请重新上传")

    # 5. Size check
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    if size > max_bytes:
        raise HTTPException(400, f"图片大小不能超过 {settings.upload_max_size_mb}MB")


def _process_image(file_path: str) -> tuple[int, int]:
    """Strip EXIF and return (width, height). Best-effort — never fails the upload.

    PIL 保存时默认不携带 EXIF（需显式传 exif 参数），保存新副本即达成去 EXIF：
    视觉像素完全不变，但比旧的像素重建（getdata/putdata）快一个量级——
    大图（数 MB）不再把全部像素拉进内存。
    """
    tmp_path = f"{file_path}.clean"
    try:
        from PIL import Image
        img = Image.open(file_path)
        w, h = img.size
        # 显式传 format：tmp 文件名后缀 .clean 不是 PIL 已知扩展名，不传会 KeyError
        img.save(tmp_path, format=img.format)
        os.replace(tmp_path, file_path)
        return w, h
    except Exception:
        # best-effort：失败时清理半成品，保留原文件，不阻断上传
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return 0, 0


@router.post("")
async def upload_file(file: UploadFile, request: Request, current_user: dict = Depends(get_current_user)):
    """Upload an image file. Returns {url, filename, size, width, height}."""
    if not file.filename:
        raise HTTPException(400, "未选择文件")

    try:
        _validate_image(file)
    except HTTPException as e:
        await log_event(None, "upload_rejected", operator=current_user["username"], operator_id=current_user["user_id"],
                        target=file.filename or "unknown", target_type="upload",
                        detail={"reason": e.detail, "content_type": file.content_type},
                        result="fail", request=request)
        raise

    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Secure filename: UUID rename, keep original extension
    ext = os.path.splitext(file.filename)[1].lower()
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / safe_name

    content = await file.read()
    file_path.write_bytes(content)

    # Strip EXIF and get dimensions (best-effort)
    width, height = _process_image(str(file_path))

    url = f"/uploads/{safe_name}"
    return {"url": url, "filename": safe_name, "size": len(content), "width": width, "height": height}
