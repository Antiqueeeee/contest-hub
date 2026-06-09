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

## 部署方式

本项目支持三种部署场景，根据网络环境选择：

- **[方式一：Docker Compose 部署（推荐）](#方式一docker-compose-部署推荐)** — 适合可访问 Docker Hub 的服务器
- **[方式二：离线交付](#方式二离线交付)** — 适合服务器无法访问 Docker Hub、或镜像拉取持续失败
- **[方式三：手动部署](#方式三手动部署)** — 适合无法使用 Docker 的裸机环境

---

## 方式一：Docker Compose 部署（推荐）

### 环境要求

- Docker & Docker Compose（`docker compose` 或 `docker-compose` 均可）
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
    --exclude='docker-images/*.tar' \
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
| `PORT` | 前端暴露端口，默认 80 |

### 4. 启动服务

```bash
docker compose up -d --build
# 旧版使用: docker-compose up -d --build
```

### 5. 访问

| 入口 | 地址 | 账号 |
|------|------|------|
| 前台首页 | http://你的服务器IP | 选手注册登录 |
| 管理后台 | http://你的服务器IP/admin/login | admin / admin123 |

### 常用运维命令

```bash
docker compose down          # docker-compose down
docker compose up -d         # docker-compose up -d
docker compose restart       # docker-compose restart
docker compose logs -f       # docker-compose logs -f
docker compose logs backend  # docker-compose logs backend
docker compose exec db psql -U contest -d contest_hub  # docker-compose exec ...
docker compose exec backend python seed.py              # docker-compose exec ...
```

### 数据备份

```bash
# 备份数据库（旧版将 docker compose 替换为 docker-compose）
docker compose exec db pg_dump -U contest contest_hub > backup.sql

# 定期备份（crontab）
0 3 * * * cd /opt/contest-hub && docker compose exec -T db pg_dump -U contest contest_hub > /backup/contest_$(date +\%Y\%m\%d).sql
```

### 配置 HTTPS（可选）

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Nginx 配置 /etc/nginx/sites-available/contest-hub:
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

---

## 方式二：离线交付

服务器无法访问 Docker Hub 时使用。项目已预置离线镜像包。

### 准备工作（由交付方执行一次）

在有 Docker Hub 访问权限的机器上，拉取并导出镜像：

```bash
# 拉取项目所需基础镜像
docker pull python:3.11-slim
docker pull node:20-alpine
docker pull nginx:alpine
docker pull postgres:17-alpine

# 导出为 tar 文件
docker save -o docker-images/python-3.11-slim.tar python:3.11-slim
docker save -o docker-images/node-20-alpine.tar node:20-alpine
docker save -o docker-images/nginx-alpine.tar nginx:alpine
docker save -o docker-images/postgres-17-alpine.tar postgres:17-alpine

# 下载 Docker Compose v2 离线安装包（x86_64）
curl -SLo docker-images/docker-compose-linux-x86_64 \
    https://github.com/docker/compose/releases/download/v2.33.0/docker-compose-linux-x86_64
chmod +x docker-images/docker-compose-linux-x86_64
```

将整个 `contest-hub/` 目录（含 `docker-images/`）交给客户。

### 客户操作步骤

```bash
# 1. 将项目上传到服务器并解压
scp contest-hub.tar.gz user@your-server:/opt/
ssh user@your-server
cd /opt && tar -xzf contest-hub.tar.gz && cd contest-hub

# 2. 一键安装 Compose v2 + 加载离线镜像
bash docker-images/load-images.sh

# 3. 配置环境变量
cp .env.example .env
nano .env  # 修改 DB_PASSWORD、JWT_SECRET 等

# 4. 构建并启动（全程无需外网）
docker compose build      # 旧版: docker-compose build
docker compose up -d      # 旧版: docker-compose up -d
```

> 详细说明见 `docker-images/README.md`

---

## 方式三：手动部署

适用于裸机环境，不依赖 Docker。

### 环境要求

- Node.js 18+
- Python 3.11+
- PostgreSQL 17+

### 1. 安装系统依赖

```bash
# Ubuntu
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm postgresql

# CentOS / RHEL
sudo dnf install -y python3.11 python3.11-devel python3-pip nodejs npm postgresql-server
```

### 2. 配置 PostgreSQL

```bash
# 启动并创建数据库
sudo systemctl start postgresql
sudo systemctl enable postgresql

sudo -u postgres psql <<EOF
CREATE USER contest WITH PASSWORD 'contest123';
CREATE DATABASE contest_hub OWNER contest;
GRANT ALL PRIVILEGES ON DATABASE contest_hub TO contest;
EOF
```

### 3. 部署后端

```bash
cd backend

# 创建虚拟环境
python3.11 -m venv venv
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 初始化管理员账号
python seed.py

# 设置环境变量
export DB_HOST="localhost" DB_PORT="5432" DB_USER="contest" DB_PASSWORD="contest123" DB_NAME="contest_hub"
export JWT_SECRET="$(openssl rand -hex 32)"
export ALLOWED_ORIGINS="http://localhost"

# 启动（开发测试用）
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

生产环境建议使用 systemd 管理后端进程：

```ini
# /etc/systemd/system/contest-hub.service
[Unit]
Description=Contest Hub Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/contest-hub/backend
Environment="DB_HOST=localhost"
Environment="DB_PORT=5432"
Environment="DB_USER=contest"
Environment="DB_PASSWORD=contest123"
Environment="DB_NAME=contest_hub"
Environment="JWT_SECRET=your-secret-here"
Environment="ALLOWED_ORIGINS=http://your-domain.com"
ExecStart=/opt/contest-hub/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now contest-hub
```

### 4. 部署前端

```bash
cd frontend

# 安装依赖并构建
npm install
npm run build

# 产物在 dist/ 目录，用 Nginx 托管
sudo cp -r dist /var/www/contest-hub
```

Nginx 配置（`/etc/nginx/sites-available/contest-hub`）：

```nginx
server {
    listen 80;
    server_name contest.example.com;

    root /var/www/contest-hub;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/contest-hub /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. 访问

| 入口 | 地址 | 账号 |
|------|------|------|
| 前台首页 | http://你的服务器IP | 选手注册登录 |
| 管理后台 | http://你的服务器IP/admin/login | admin / admin123 |

---

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
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
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
| `DB_HOST` | `localhost` | 数据库主机地址 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_USER` | `contest` | 数据库用户名 |
| `DB_PASSWORD` | `contest123` | 数据库密码（支持特殊字符，自动编码） |
| `DB_NAME` | `contest_hub` | 数据库名 |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT 签名密钥 |
| `JWT_EXPIRE_MINUTES` | `120` | Token 有效期（分钟） |
| `EXPORT_DIR` | `./exports` | 导出文件目录 |
| `EXPORT_RETENTION_DAYS` | `7` | 导出文件保留天数 |
