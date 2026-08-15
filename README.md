# 河北省青少年数字素养提升技能竞赛平台

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
│   ├── functional-requirements.md    # 功能需求
│   ├── 客户操作手册.md                # 交付后客户（非技术）必读：上线 checklist + 日常注意事项
│   ├── compliance-gaps.md            # 合规差距分析（法规对照与整改记录）
│   ├── incident-response.md          # 数据安全事件应急预案
│   └── pia-report.md                 # 个人信息保护影响评估报告
└── README.md
```

> **交付提示**：部署完成后，请把 `docs/客户操作手册.md` 交给客户——里面用非技术语言写清了上线前必须做的事（改密码、填隐私政策、配 HTTPS、设备份）和日常使用注意事项。

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
bash scripts/setup-env.sh
```

脚本会自动完成：
- 首次运行时从 `.env.example` 创建 `.env`
- 检测并自动生成缺失的密钥（`JWT_SECRET`、`ENCRYPTION_KEY`）
- 提示输入 `DB_PASSWORD`

每次 `git pull` 拉取新代码后也可运行此脚本，自动补全新增的必填配置项，不会覆盖已有值。

> 手动配置请参考 `.env.example` 文件内注释。

### 4. 启动服务

```bash
docker compose up -d --build
# 旧版使用: docker-compose up -d --build
```

### 5. 访问

| 入口 | 地址 | 账号 |
|------|------|------|
| 前台首页 | http://你的服务器IP | 选手注册登录 |
| 管理后台 | http://你的服务器IP/admin/login | admin / 随机初始密码（见 backend 日志） |

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

推荐使用备份脚本 `scripts/backup.sh`：自动 gzip 压缩、备份文件按时间戳命名、保留最近 30 天。

```bash
# 手动执行一次备份（输出到 backups/contest_hub_YYYYMMDD_HHMMSS.sql.gz）
bash scripts/backup.sh

# 定期备份（crontab，每天凌晨 3 点）
0 3 * * * cd /opt/contest-hub && bash scripts/backup.sh >> backups/backup.log 2>&1

# 恢复备份
gunzip -c backups/contest_hub_XXXXXXXX_XXXXXX.sql.gz | docker compose exec -T db psql -U contest contest_hub
```

### 配置 HTTPS

项目内 nginx 运行在 HTTP 80 端口。如需 HTTPS，在服务器外层 nginx 配置 SSL 证书并反向代理：

```nginx
# /etc/nginx/sites-available/contest-hub
server {
    listen 443 ssl http2;
    server_name contest.example.com;

    ssl_certificate     /etc/letsencrypt/live/contest.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/contest.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;   # 与 .env 的 PORT 保持一致（见下方注意）
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;   # ← 关键：告知后端原始协议
    }
}

server {
    listen 80;
    server_name contest.example.com;
    return 301 https://$server_name$request_uri;
}
```

**外层 nginx 必须设置 `X-Forwarded-Proto: https`**，同时在 `.env` 中设置 `TRUST_PROXY=true`——容器启动时会自动启用 `frontend/nginx.conf` 中的透传 map（出于安全考虑默认不透传，防止直接对外部署时客户端伪造该头）。后端据此正确处理 CORS、重定向及 `FORCE_HTTPS` 判定。

使用 Let's Encrypt 免费获取证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d contest.example.com
```

> **注意**：容器 nginx 默认占用宿主机 80 端口，与外层 nginx 冲突。配置 HTTPS 前先在 `.env` 中设置 `PORT=8080`（或其它端口），并让外层 nginx `proxy_pass http://127.0.0.1:8080`。云服务器还需在安全组放行 80/443 端口（阿里云 ECS 默认不放行 443）；域名解析到境内服务器必须完成 ICP 备案，否则会被云厂商阻断。

---

### 常见部署问题（国内服务器）

**1. Docker 安装脚本无法访问（`Connection reset by peer`）**

`curl -fsSL https://get.docker.com | bash` 在国内服务器上通常连不上，改用阿里云镜像源安装：

```bash
# Ubuntu
apt-get update && apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
> /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker

# CentOS
yum install -y yum-utils
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

**2. 普通用户操作 Docker 报 `permission denied ... docker.sock`**

当前用户不在 docker 组。加入后必须重新登录（或 `newgrp docker`）才生效：

```bash
sudo usermod -aG docker <用户名>
```

**3. 拉取镜像超时 / `unexpected EOF` / layer `not found`**

Docker Hub 国内无法直连，配置镜像加速器：

```bash
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
EOF
sudo systemctl restart docker
```

加速器不稳定，报错时先重试（`docker compose pull` 支持续传）。若某镜像反复报 `not found`（加速器缓存不一致），换源拉取后重打标签：

```bash
docker pull docker.m.daocloud.io/library/nginx:alpine
docker tag docker.m.daocloud.io/library/nginx:alpine nginx:alpine
```

加速器全部不可用时，改用 [方式二：离线交付](#方式二离线交付)。

**4. GitHub 克隆报 `Permission denied (publickey)`**

public 仓库用 HTTPS 地址克隆即可，无需认证：`git clone https://github.com/...`。确需 SSH 则在服务器上 `ssh-keygen` 生成密钥，把公钥添加到 GitHub 账号。

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
bash scripts/setup-env.sh

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
Environment="ENCRYPTION_KEY=your-fernet-key-here"
Environment="ALLOWED_ORIGINS=http://your-domain.com"
ExecStart=/opt/contest-hub/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers
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
        proxy_set_header X-Forwarded-Proto $scheme;
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
| 管理后台 | http://你的服务器IP/admin/login | admin / 随机初始密码（见 backend 日志） |

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
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --proxy-headers
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
| 管理后台 | http://localhost:5173/admin/login | admin / 随机初始密码（见 backend 日志） |

## 功能概览

### 选手端

- 注册登录（邮箱 + 密码）
- 浏览赛事信息、新闻通知
- 在线报名参赛
- 查询个人成绩
- 个人中心：我的报名、我的成绩
- 隐私与安全：修改密码、授权管理（撤回同意）、导出我的数据、注销账号

### 管理后台

- 新闻管理（分类 + 发布/归档）
- 赛事管理（创建/编辑/发布/状态流转）
- 组别管理（学历分组、技能分组等模板）
- 报名管理（查看/筛选/软删除）
- 成绩管理（录入/批量导入/发布/撤回）
- 数据导出（Excel 异步生成，导出文件每日自动清理）
- 站点内容管理（关于/FAQ/联系/隐私政策页面可编辑）
- 系统设置（数据保留期限：报名/软删清除/导出文件/审计日志 IP）
- 管理员账号管理 + 修改密码

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
- `GET|PUT /api/admin/settings` — 系统设置（数据保留期限）
- `GET|PUT /api/admin/settings/registration` + `GET /api/public/settings/registration` — 注册开关（开放/关闭选手注册，默认开放）
- `GET|PUT /api/admin/settings/minor-protection` + `GET /api/public/settings/minor-protection` — 未成年人保护开关
- `POST /api/auth/password` — 管理员修改密码
- `GET /api/public/*` — 前台公开接口
- `GET|PUT /api/contestant/*` — 选手个人接口
- `POST /api/contestant/password|deactivate` — 选手改密/注销
- `GET /api/contestant/my-data|consents` — 个人数据查阅/同意管理

## 环境变量

后端通过环境变量或 `.env` 文件配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_HOST` | `localhost` | 数据库主机地址 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_USER` | `contest` | 数据库用户名 |
| `DB_PASSWORD` | —（必填） | 数据库密码 |
| `DB_NAME` | `contest_hub` | 数据库名 |
| `JWT_SECRET` | —（必填） | JWT 签名密钥 |
| `ENCRYPTION_KEY` | —（必填） | PII 加密密钥（Fernet 格式），用于加密存储身份证号和手机号 |
| `JWT_EXPIRE_MINUTES` | `120` | Token 有效期（分钟） |
| `ALLOWED_ORIGINS` | `http://localhost` | CORS 允许的来源，逗号分隔 |
| `EXPORT_DIR` | `./exports` | 导出文件目录 |
| `EXPORT_RETENTION_DAYS` | `7` | 导出文件保留天数 |
| `EXPORT_MAX_ROWS` | `50000` | 单次导出最大行数 |

### 生成必填密钥

```bash
# JWT 签名密钥
python -c "import secrets; print(secrets.token_urlsafe(32))"

# PII 加密密钥（Fernet）
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### PII 数据保护

系统对以下敏感个人信息做加密存储和 API 脱敏：

| 字段 | 存储方式 | API 返回格式 |
|------|---------|------------|
| 身份证号 | AES 加密（Fernet） | `3201****1234` |
| 手机号 | AES 加密（Fernet） | `138****5678` |
| 密码 | bcrypt 单向哈希 | 永不返回 |

导出 Excel 含**明文**身份证号（用于主办归档报送），文件默认仅保留 1 天（后台「系统设置」可配），由每日清理任务自动删除。
