#!/bin/bash
# 导出基础镜像为 tar 文件，用于离线交付
# 在有网络的机器上运行此脚本
set -e

IMAGES_DIR="./images"
mkdir -p "$IMAGES_DIR"

# 基础镜像列表（与 Dockerfile 和 docker-compose.yml 保持一致）
IMAGES=(
    "python:3.11-slim"
    "node:20-alpine"
    "nginx:alpine"
    "postgres:17-alpine"
)

echo "=== 拉取基础镜像 ==="
for img in "${IMAGES[@]}"; do
    echo "Pulling: $img"
    docker pull "$img"
done

echo ""
echo "=== 导出镜像为 tar 文件 ==="
for img in "${IMAGES[@]}"; do
    # 将 : 和 / 替换为 - 作为文件名
    filename=$(echo "$img" | tr ':/' '--')
    echo "Exporting: $img -> $IMAGES_DIR/${filename}.tar"
    docker save -o "$IMAGES_DIR/${filename}.tar" "$img"
done

echo ""
echo "=== 导出完成 ==="
ls -lh "$IMAGES_DIR"/
echo ""
echo "镜像文件位于 $IMAGES_DIR/ 目录"
echo "将这些 tar 文件随源码一起交付给客户"
