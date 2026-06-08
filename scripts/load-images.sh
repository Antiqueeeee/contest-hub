#!/bin/bash
# 加载离线镜像（客户侧运行）
# 将镜像 tar 文件放在 images/ 目录下，然后运行此脚本
set -e

IMAGES_DIR="./images"

if [ ! -d "$IMAGES_DIR" ]; then
    echo "错误: 未找到 $IMAGES_DIR 目录"
    echo "请将镜像 tar 文件放到 $IMAGES_DIR/ 目录下"
    exit 1
fi

echo "=== 加载基础镜像 ==="
for tarfile in "$IMAGES_DIR"/*.tar; do
    if [ -f "$tarfile" ]; then
        echo "Loading: $tarfile"
        docker load -i "$tarfile"
    fi
done

echo ""
echo "=== 加载完成，当前已有镜像 ==="
docker images | grep -E "python|node|nginx|postgres"

echo ""
echo "镜像加载完成。现在可以运行: docker compose up -d --build"
