# Docker 镜像离线交付说明

## 文件清单

交付的 `docker-images/` 目录中包含：

| 文件 | 大小 | 用途 |
|------|------|------|
| `python-3.11-slim.tar` | ~124M | 后端基础镜像 |
| `node-20-alpine.tar` | ~132M | 前端构建镜像 |
| `nginx-alpine.tar` | ~61M | 前端运行镜像 |
| `postgres-17-alpine.tar` | ~269M | PostgreSQL 数据库 |
| `docker-compose-linux-x86_64` | ~71M | Docker Compose v2 离线安装包（x86_64） |
| `load-images.sh` | — | 一键加载脚本 |

## 操作步骤

### 1. 将 docker-images 目录拷贝到服务器

```bash
scp -r docker-images/ user@server:/path/to/contest-hub/
```

### 2. 进入项目目录，执行加载脚本

```bash
cd /path/to/contest-hub
bash docker-images/load-images.sh
```

脚本会自动完成两件事：
- **安装 Docker Compose v2**（若尚未安装）— 复制二进制到 `/usr/local/lib/docker/cli-plugins/`，无需外网
- **加载 4 个 Docker 镜像** — 导入 tar 包到本地 Docker

### 3. 构建并启动项目

```bash
docker compose build      # 旧版: docker-compose build
docker compose up -d      # 旧版: docker-compose up -d
```

构建过程不再需要从 Docker Hub 拉取基础镜像，全程离线完成。

## 注意事项

- 服务器需提前安装好 **Docker Engine**（镜像包不含 Docker Engine 本身，仅含 Compose 插件）
- 若服务器是 ARM 架构（如树莓派、鲲鹏），需额外下载 `docker-compose-linux-aarch64` 并替换
- `docker load` 加载的镜像与 `docker pull` 获取的完全一致，不影响后续使用
- 如果项目 Dockerfile 中引用的基础镜像版本有更新，需重新导出 tar 包
