from contextlib import asynccontextmanager
from pathlib import Path
import asyncio
import contextlib
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db, async_session
from app.api.auth import router as auth_router, admin_router as user_admin_router
from app.api.news import admin_router as news_admin_router, public_router as news_public_router
from app.api.contest import admin_router as contest_admin_router, public_router as contest_public_router
from app.api.registration import admin_router as reg_admin_router, public_router as reg_public_router, export_router
from app.api.result import admin_router as result_admin_router, public_router as result_public_router
from app.api.contestant import router as contestant_router
from app.api.site_content import admin_router as site_content_admin, public_router as site_content_public
from app.api.groups import router as groups_router
from app.api.upload import router as upload_router
from app.api.carousel import admin_router as carousel_admin_router, public_router as carousel_public_router
from app.api.settings import admin_router as settings_admin_router, public_router as settings_public_router

logger = logging.getLogger("app")


async def _cleanup_loop():
    """每日执行一次数据保留清理（启动 60 秒后先跑一轮）。"""
    from app.services.cleanup_service import run_cleanup_once
    await asyncio.sleep(60)
    while True:
        try:
            async with async_session() as db:
                stats = await run_cleanup_once(db)
            if any(stats.values()):
                logger.info("retention cleanup: %s", stats)
        except Exception:
            logger.exception("retention cleanup failed")
        await asyncio.sleep(24 * 3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    cleanup_task = asyncio.create_task(_cleanup_loop())
    yield
    cleanup_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await cleanup_task


app = FastAPI(title="河北省青少年数字素养提升技能竞赛", version="1.0.0", lifespan=lifespan, docs_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 等保 2.0：敏感接口在非 HTTPS 下拒绝（force_https 开启时生效）
_HTTPS_PROTECTED_PREFIXES = ("/api/auth", "/api/admin/export", "/api/contestant", "/api/public/contests")


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    settings = get_settings()
    if settings.force_https and request.url.path.startswith(_HTTPS_PROTECTED_PREFIXES):
        proto = request.headers.get("X-Forwarded-Proto", request.url.scheme)
        if proto != "https":
            return JSONResponse(status_code=403, content={"detail": "该接口要求通过 HTTPS 访问"})

    response = await call_next(request)
    # 安全响应头（等保 2.0 安全加固）
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if settings.force_https:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

# Auth
app.include_router(auth_router)
app.include_router(user_admin_router)
app.include_router(settings_admin_router)
app.include_router(settings_public_router)

# News
app.include_router(news_admin_router)
app.include_router(news_public_router)

# Contest
app.include_router(contest_admin_router)
app.include_router(contest_public_router)

# Registration
app.include_router(reg_admin_router)
app.include_router(reg_public_router)
app.include_router(export_router)

# Result
app.include_router(result_admin_router)
app.include_router(result_public_router)

# Contestant
app.include_router(contestant_router)

# Site Content
app.include_router(site_content_admin)
app.include_router(site_content_public)

# Groups
app.include_router(groups_router)

# Upload
app.include_router(upload_router)

# Carousel
app.include_router(carousel_admin_router)
app.include_router(carousel_public_router)

# Static files: serve uploaded images
_upload_dir = Path(get_settings().upload_dir)
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_dir)), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
