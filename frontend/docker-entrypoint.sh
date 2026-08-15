#!/bin/sh
set -e

# TRUST_PROXY=true：部署在外层 HTTPS 反向代理之后，启用 nginx.conf 中
# 固定输出 X-Forwarded-Proto: https 的行（默认注释关闭，防止直接对外时
# 客户端伪造该头绕过 FORCE_HTTPS）。
# 注意：此逻辑在容器启动时执行，修改 .env 后必须 docker compose up -d
# 重建容器（docker compose restart 不会重新执行本脚本）。
if [ "$TRUST_PROXY" = "true" ]; then
    sed -i 's|^[[:space:]]*#[[:space:]]*"~\."|"~."|' /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"
