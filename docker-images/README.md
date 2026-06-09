# Docker 镜像离线交付说明

## 文件清单

交付的 `docker-images/` 目录中包含：

| 文件 | 镜像 | 大小 | 用途 |
|------|------|------|------|
| `python-3.11-slim.tar` | `python:3.11-slim` | ~124M | 后端基础镜像 |
| `node-20-alpine.tar` | `node:20-alpine` | ~132M | 前端构建镜像 |
| `nginx-alpine.tar` | `nginx:alpine` | ~61M | 前端运行镜像 |
| `postgres-17-alpine.tar` | `postgres:17-alpine` | ~269M | PostgreSQL 数据库 |
| `load-images.sh` | — | — | 一键加载脚本 |

## 操作步骤

### 1. 将 docker-images 目录拷贝到服务器

```bash
scp -r docker-images/ user@server:/path/to/contest-hub/
```

### 2. 进入项目目录，加载镜像

```bash
cd /path/to/contest-hub
bash docker-images/load-images.sh
```

脚本会依次加载 4 个镜像，完成后显示镜像列表。

### 3. 构建并启动项目

```bash
docker compose build      # 旧版: docker-compose build
docker compose up -d      # 旧版: docker-compose up -d
```

构建过程不再需要从 Docker Hub 拉取基础镜像，全程离线完成。

## 注意事项

- 服务器需提前安装好 Docker 和 Docker Compose
- `docker load` 加载的镜像与 `docker pull` 获取的完全一致，不影响后续使用
- 如果项目 Dockerfile 中引用的基础镜像版本有更新，需要重新导出新的 tar 包
