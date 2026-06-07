from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api.auth import router as auth_router, admin_router as user_admin_router
from app.api.news import admin_router as news_admin_router, public_router as news_public_router
from app.api.contest import admin_router as contest_admin_router, public_router as contest_public_router
from app.api.registration import admin_router as reg_admin_router, public_router as reg_public_router, export_router
from app.api.result import admin_router as result_admin_router, public_router as result_public_router
from app.api.contestant import router as contestant_router
from app.api.site_content import admin_router as site_content_admin, public_router as site_content_public


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="竞赛信息发布平台", version="1.0.0", lifespan=lifespan, docs_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth
app.include_router(auth_router)
app.include_router(user_admin_router)

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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
