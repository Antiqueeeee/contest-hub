#!/bin/bash
# E2E 测试环境：一次性 PG 容器 + 后端 :8000 + 前端 preview :4173
# 用法: bash scripts/e2e-env.sh start|stop
set -euo pipefail
cd "$(dirname "$0")/.."

export DB_HOST=localhost DB_PORT=55433 DB_USER=contest DB_PASSWORD=test123 DB_NAME=contest_hub_e2e
# e2e 用例集会在 60 秒窗口内真实触发登录/报名限流阈值，放宽 10 倍（生产不设置）
export RATE_LIMIT_MULTIPLIER=10
export JWT_SECRET=e2e-jwt-secret-not-for-production
export ALLOWED_ORIGINS=http://localhost:4173

case "${1:-start}" in
start)
  # 密钥只在启动后端时需要；放在 start 分支避免 stop 也依赖 python 环境里的 cryptography
  export ENCRYPTION_KEY="${E2E_ENCRYPTION_KEY:-$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")}"
  docker rm -f contest-e2e-pg >/dev/null 2>&1 || true
  docker run -d --name contest-e2e-pg -e POSTGRES_USER=contest -e POSTGRES_PASSWORD=test123 \
    -e POSTGRES_DB=contest_hub_e2e -p 55433:5432 postgres:17-alpine >/dev/null
  for i in $(seq 1 30); do docker exec contest-e2e-pg pg_isready -U contest >/dev/null 2>&1 && break; sleep 1; done

  (cd backend && alembic upgrade head >/dev/null && \
   python -c "
import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models.user import User
from app.services.auth_service import hash_password
async def main():
    async with async_session() as db:
        if not (await db.execute(select(User).where(User.username == 'admin'))).scalar_one_or_none():
            db.add(User(username='admin', password_hash=hash_password('Admin123!'), name='E2E管理员', phone=''))
            await db.commit()
asyncio.run(main())
" && setsid nohup uvicorn app.main:app --port 8000 > /tmp/e2e-backend.log 2>&1 &)

  (cd frontend && VITE_API_BASE=http://localhost:8000/api npm run build >/dev/null && \
   setsid nohup npx vite preview --port 4173 --strictPort > /tmp/e2e-frontend.log 2>&1 &)

  for i in $(seq 1 30); do curl -sf http://localhost:8000/api/health >/dev/null 2>&1 && break; sleep 1; done
  for i in $(seq 1 30); do curl -sf http://localhost:4173 >/dev/null 2>&1 && break; sleep 1; done
  echo "E2E env ready: frontend=http://localhost:4173 backend=http://localhost:8000 admin=admin/Admin123!"
  ;;
stop)
  pkill -f "uvicorn app.main:app --port 8000" || true
  pkill -f "vite preview --port 4173" || true
  docker rm -f contest-e2e-pg >/dev/null 2>&1 || true
  echo "E2E env stopped"
  ;;
esac
