#!/bin/bash
# Contest Hub - Docker 镜像离线加载脚本
# 使用方法: bash load-images.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 开始加载 Docker 镜像 ==="

for f in "$SCRIPT_DIR"/*.tar; do
    echo "加载: $(basename "$f")"
    docker load -i "$f"
done

echo ""
echo "=== 加载完成，已导入的镜像: ==="
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" \
    python:3.11-slim \
    node:20-alpine \
    nginx:alpine \
    postgres:17-alpine

echo ""
echo "现在可以执行: docker compose build && docker compose up -d"
echo "旧版 Docker Compose: docker-compose build && docker-compose up -d"
