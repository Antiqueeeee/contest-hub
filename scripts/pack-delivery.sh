#!/bin/bash
# 打包完整交付包（源码 + 基础镜像）
# 在有网络且能访问 Docker Hub 的机器上运行此脚本
set -e

PACKAGE_NAME="contest-hub-delivery-$(date +%Y%m%d)"
PACKAGE_DIR="./${PACKAGE_NAME}"
PROJECT_DIR=".."

echo "=== 打包项目交付件: ${PACKAGE_NAME} ==="

# 清理旧包
rm -rf "$PACKAGE_DIR" "${PACKAGE_NAME}.tar.gz"

# 创建目录结构
mkdir -p "$PACKAGE_DIR"

# 1. 复制源码（排除不需要的文件）
echo "Step 1/3: 复制项目源码..."
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='__pycache__' \
          --exclude='*.pyc' \
          --exclude='exports/' \
          --exclude='images/' \
          --exclude='dist/' \
          "$PROJECT_DIR/" "$PACKAGE_DIR/contest-hub/"

# 2. 导出基础镜像（放在 contest-hub/images/ 下，客户可直接使用 load-images.sh）
echo "Step 2/3: 导出基础镜像..."
cd "$PACKAGE_DIR/contest-hub"
bash scripts/export-images.sh
cd - > /dev/null

# 3. 创建交付包 README
echo "Step 3/3: 生成交付说明..."
cat > "$PACKAGE_DIR/README.md" << 'DELIVERY_EOF'
# 竞赛信息发布平台 - 交付包

## 交付内容

```
contest-hub-delivery/
├── contest-hub/                 # 项目源码
│   ├── images/                  # 基础 Docker 镜像（离线 tar 文件）
│   │   ├── python--3.11-slim.tar
│   │   ├── node--20-alpine.tar
│   │   ├── nginx--alpine.tar
│   │   └── postgres--17-alpine.tar
│   ├── docker-compose.yml
│   ├── scripts/load-images.sh   # 加载镜像脚本
│   └── ...
└── README.md                    # 本文件
```

## 客户部署步骤

### 前提条件

- 服务器已安装 Docker 和 Docker Compose
- 推荐配置：2 核 4G，Linux（Ubuntu 22.04+）

### 1. 解压

```bash
tar -xzf contest-hub-delivery-*.tar.gz
cd contest-hub-delivery-*/contest-hub
```

### 2. 加载基础镜像

```bash
bash scripts/load-images.sh
```

此脚本将 4 个基础镜像（python、node、nginx、postgres）加载到本地 Docker。

### 3. 配置环境变量

```bash
cp .env.example .env
nano .env
```

务必修改：
- `DB_PASSWORD` — 数据库密码
- `JWT_SECRET` — 用 `openssl rand -hex 32` 生成随机密钥
- `ALLOWED_ORIGINS` — 改为实际访问域名

### 4. 按需修改代码（可选）

可根据需要修改 `backend/` 和 `frontend/` 下的源码（Logo、标题、样式等）。

### 5. 构建并启动

```bash
docker compose up -d --build
```

首次构建约 3-5 分钟（从本地镜像构建，无需联网）。

### 6. 访问

| 入口 | 地址 | 账号 |
|------|------|------|
| 前台首页 | http://服务器IP | 选手注册登录 |
| 管理后台 | http://服务器IP/admin/login | admin / admin123 |

## 修改代码后重新部署

```bash
# 修改代码后，重新构建镜像并重启
docker compose up -d --build

# 只重建某一个服务
docker compose up -d --build backend    # 只重建后端
docker compose up -d --build frontend   # 只重建前端
```

## 常用运维命令

```bash
docker compose down              # 停止所有服务
docker compose up -d             # 启动（不重新构建）
docker compose logs -f           # 查看所有日志
docker compose logs backend      # 查看后端日志
docker compose restart           # 重启所有服务
docker compose ps                # 查看服务状态
docker compose exec db psql -U contest -d contest_hub  # 进入数据库
```
DELIVERY_EOF

# 打包
echo ""
echo "=== 打包为 tar.gz ==="
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"

echo ""
echo "=== 交付包已生成 ==="
ls -lh "${PACKAGE_NAME}.tar.gz"
echo ""
echo "交付给客户: ${PACKAGE_NAME}.tar.gz"
echo "客户解压: tar -xzf ${PACKAGE_NAME}.tar.gz"
echo "客户部署: cd ${PACKAGE_NAME}/contest-hub && bash scripts/load-images.sh && docker compose up -d --build"
