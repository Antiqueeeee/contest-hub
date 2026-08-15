"""轮播图模糊占位图接口。

前端渐进加载：原图下载完成前显示本接口生成的极小模糊占位图（短边约 24px），
完成后原图淡入。按需生成并永久缓存于 upload_dir/.blur/，存量图片无需迁移。
公开无鉴权——占位图只是已公开原图的低分辨率副本。
"""

import os
import re
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import get_settings

router = APIRouter(prefix="/api/public/uploads-blur", tags=["图片占位图"])

# 与 upload.py 的文件名规范一致：uuid 十六进制 + 白名单扩展名（gif 排除：动图压平会失真）
FILENAME_RE = re.compile(r"^[0-9a-f]{32}\.(jpg|jpeg|png|webp)$")
BLUR_DIR_NAME = ".blur"
TARGET_MIN_DIM = 24          # 短边缩放目标（像素）
CACHE_CONTROL = "public, max-age=86400"


def _generate_blur(src: Path, dst: Path) -> None:
    """生成模糊占位图（短边 ~24px 的 JPEG），原子写入缓存文件。"""
    from PIL import Image, ImageFilter
    with Image.open(src) as img:
        img = img.convert("RGB")
        w, h = img.size
        scale = TARGET_MIN_DIM / min(w, h)
        small = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        small = small.filter(ImageFilter.GaussianBlur(0.5))  # 轻模糊进一步去细节
        dst.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(suffix=".jpg", dir=str(dst.parent))
        os.close(fd)
        try:
            small.save(tmp, format="JPEG", quality=50)
            os.replace(tmp, dst)   # 原子替换：并发请求不会读到半成品
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)


@router.get("/{filename}")
async def get_blur(filename: str):
    if not FILENAME_RE.match(filename):
        raise HTTPException(404, "图片不存在")
    upload_dir = Path(get_settings().upload_dir)
    cache_path = upload_dir / BLUR_DIR_NAME / f"{filename}.jpg"
    if cache_path.is_file():
        return FileResponse(cache_path, media_type="image/jpeg", headers={"Cache-Control": CACHE_CONTROL})
    original = upload_dir / filename
    if not original.is_file():
        raise HTTPException(404, "图片不存在")
    try:
        _generate_blur(original, cache_path)
    except Exception:
        # 原图损坏/异常尺寸（DecompressionBomb 等）一律按不存在处理，不缓存
        raise HTTPException(404, "图片不存在")
    return FileResponse(cache_path, media_type="image/jpeg", headers={"Cache-Control": CACHE_CONTROL})
