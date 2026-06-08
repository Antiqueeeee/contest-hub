# 竞赛信息发布平台

轻量级竞赛信息发布与管理平台，支持赛事宣传、在线报名、成绩发布与数据导出。

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| 后端 | Python 3.11 + FastAPI + SQLAlchemy 2.0 (async) |
| 数据库 | PostgreSQL 17 |
| 部署 | Docker Compose |

## 项目结构

```
contest-hub/
├── frontend/          # React 前端
│   └── src/
│       ├── api/           # API 客户端
│       ├── components/    # 通用组件（布局、UI）
│       ├── hooks/         # React Hooks（认证）
│       ├── pages/         # 页面
│       │   ├── admin/     # 管理后台页面
│       │   └── public/    # 前台选手页面
│       └── mock/          # 前端 Mock 数据（已废弃）
├── backend/           # FastAPI 后端
│   └── app/
│       ├── api/           # API 路由
│       ├── models/        # SQLAlchemy 数据模型
│       ├── schemas/       # Pydantic 请求/响应模型
│       ├── services/      # 业务逻辑
│       └── middleware/    # 认证中间件
├── docs/              # 文档
│   ├── PRD.md                        # 完整 PRD
│   └── functional-requirements.md    # 功能需求
└── README.md
```

## 快速开始（本地开发）

### 环境要求

- Node.js 18+
- Python 3.11+
- Docker（用于 PostgreSQL）

### 1. 启动数据库

```bash
docker run -d \
  --name contest-db \
  -e POSTGRES_USER=contest \
  -e POSTGRES_PASSWORD=contest123 \
  -e POSTGRES_DB=contest_hub \
  -p 5432:5432 \
  postgres:17-alpine
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
python seed.py              # 创建管理员账号
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 4. 访问

| 入口 | 地址 | 账号 |
|------|------|------|
| 前台首页 | http://localhost:5173 | 选手注册登录 |
| 管理后台 | http://localhost:5173/admin/login | admin / admin123 |

---

## 云服务器部署（Docker Compose）

### 环境要求

- 服务器安装 Docker 和 Docker Compose
- 推荐配置：2 核 4G，Linux（Ubuntu 22.04 / CentOS 7+）

### 1. 安装 Docker

```bash
# Ubuntu
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# 安装 Docker Compose 插件
sudo apt install docker-compose-plugin
```

### 2. 上传项目到服务器

```bash
# 在本地打包
tar --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
    -czf contest-hub.tar.gz contest-hub/

# 上传到服务器
scp contest-hub.tar.gz user@your-server:/opt/

# 在服务器上解压
ssh user@your-server
cd /opt && tar -xzf contest-hub.tar.gz && cd contest-hub
```

### 3. 配置环境变量

```bash
cp .env.example .env
nano .env  # 修改以下内容：
```

| 变量 | 说明 |
|------|------|
| `DB_PASSWORD` | 数据库密码，务必修改 |
| `JWT_SECRET` | JWT 签名密钥，用 `openssl rand -hex 32` 生成 |
| `ALLOWED_ORIGINS` | 改为你的域名，如 `http://contest.example.com` |
| `PORT` | 前端暴露端口，默认 80（如需 HTTPS 后面加 Nginx 反代） |

### 4. 启动服务

```bash
docker compose up -d --build
```

### 5. 查看日志

```bash
docker compose logs -f
```

### 6. 访问

| 入口 | 地址 | 账号 |
|------|------|------|
| 前台首页 | http://你的服务器IP | 选手注册登录 |
| 管理后台 | http://你的服务器IP/admin/login | admin / admin123 |

### 常用运维命令

```bash
docker compose down          # 停止服务
docker compose up -d         # 后台启动
docker compose restart       # 重启所有服务
docker compose logs backend  # 查看后端日志
docker compose exec db psql -U contest -d contest_hub  # 进入数据库
docker compose exec backend python seed.py              # 重置管理员密码
```

### 数据备份

```bash
# 备份数据库
docker compose exec db pg_dump -U contest contest_hub > backup.sql

# 定期备份（crontab）
0 3 * * * cd /opt/contest-hub && docker compose exec -T db pg_dump -U contest contest_hub > /backup/contest_$(date +\%Y\%m\%d).sql
```

### 配置 HTTPS（可选）

推荐使用 Nginx 反向代理 + Certbot：

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Nginx 配置示例（/etc/nginx/sites-available/contest-hub）
# server {
#     listen 80;
#     server_name contest.example.com;
#     location / {
#         proxy_pass http://127.0.0.1:80;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#     }
# }

sudo certbot --nginx -d contest.example.com
```

## 功能概览

### 选手端

- 注册登录（手机号 + 密码）
- 浏览赛事信息、新闻通知
- 在线报名参赛
- 查询个人成绩
- 个人中心：我的报名、我的成绩

### 管理后台

- 新闻管理（分类 + 发布/归档）
- 赛事管理（创建/编辑/发布/状态流转）
- 组别管理（学历分组、技能分组等模板）
- 报名管理（查看/筛选/软删除）
- 成绩管理（录入/批量导入/发布/撤回）
- 数据导出（Excel 异步生成）
- 站点内容管理（关于/FAQ/联系页面可编辑）
- 管理员账号管理

### 赛事状态流转

```
草稿 → 报名中 → 进行中 → 已结束
         ↘ 已取消（终态）
```

## API 概览

后端提供 40+ RESTful 接口，分为：

- `POST /api/auth/login` — 管理员登录
- `POST /api/auth/contestant/register|login` — 选手注册/登录
- `GET|POST|PUT|DELETE /api/admin/news` — 新闻管理
- `GET|POST|PUT|DELETE /api/admin/contests` — 赛事管理
- `GET|POST|PUT|DELETE /api/admin/groups` — 组别管理
- `GET|DELETE /api/admin/registrations` — 报名管理
- `GET|POST|PATCH /api/admin/results` — 成绩管理
- `POST /api/admin/export` — 数据导出
- `GET|PUT /api/admin/site-content/:key` — 站点内容
- `GET /api/public/*` — 前台公开接口
- `GET|PUT /api/contestant/*` — 选手个人接口

## 环境变量

后端通过环境变量或 `.env` 文件配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgresql+asyncpg://contest:contest123@localhost:5432/contest_hub` | 数据库连接 |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT 签名密钥 |
| `JWT_EXPIRE_MINUTES` | `120` | Token 有效期（分钟） |
| `EXPORT_DIR` | `./exports` | 导出文件目录 |
| `EXPORT_RETENTION_DAYS` | `7` | 导出文件保留天数 |
