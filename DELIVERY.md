# 离线交付方案

## 背景

客户环境可能无法访问 Docker Hub，因此需要将基础镜像随源码一起交付。
客户拿到镜像后加载到本地，修改代码后可通过 `docker compose up -d --build` 自行构建。

## 依赖的基础镜像

| 镜像 | 用途 | Dockerfile |
|------|------|------------|
| `python:3.11-slim` | 后端运行环境 | `backend/Dockerfile` |
| `node:20-alpine` | 前端构建 | `frontend/Dockerfile` (builder stage) |
| `nginx:alpine` | 前端静态文件服务 | `frontend/Dockerfile` (runner stage) |
| `postgres:17-alpine` | 数据库 | `docker-compose.yml` (直接使用镜像) |

## 交付流程（开发者侧）

### 1. 导出镜像 + 打包

```bash
# 一键打包：导出镜像 + 复制源码 + 生成交付说明
bash scripts/pack-delivery.sh
```

生成文件：`contest-hub-delivery-YYYYMMDD.tar.gz`

### 2. 交付给客户

将 `.tar.gz` 文件发送给客户（U 盘、网盘、内网共享等）。

---

## 部署流程（客户侧）

### 1. 解压

```bash
tar -xzf contest-hub-delivery-YYYYMMDD.tar.gz
cd contest-hub-delivery-YYYYMMDD/contest-hub
```

### 2. 加载基础镜像

```bash
bash scripts/load-images.sh
```

### 3. 配置环境变量

```bash
cp .env.example .env
nano .env
```

### 4. 按需修改代码

修改 `backend/` 或 `frontend/` 下的源码，如 Logo、标题、颜色等。

### 5. 构建并启动

```bash
docker compose up -d --build
```

### 6. 访问

| 入口 | 地址 | 账号 |
|------|------|------|
| 前台 | http://服务器IP | 选手注册 |
| 后台 | http://服务器IP/admin/login | admin / admin123 |

---

## 脚本说明

| 脚本 | 运行方 | 作用 |
|------|--------|------|
| `scripts/export-images.sh` | 开发者 | 从 Docker Hub 拉取镜像并导出为 tar |
| `scripts/pack-delivery.sh` | 开发者 | 一键打包交付件（镜像 + 源码） |
| `scripts/load-images.sh` | 客户 | 从 tar 文件加载镜像到本地 Docker |
