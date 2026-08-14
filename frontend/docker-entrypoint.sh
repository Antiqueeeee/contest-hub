#!/bin/sh
set -e

# TRUST_PROXY=true：部署在外层 HTTPS 反向代理之后，启用 nginx.conf 中
# X-Forwarded-Proto 透传（默认注释关闭，防止直接对外时客户端伪造该头）。
if [ "$TRUST_PROXY" = "true" ]; then
    sed -i 's|^[[:space:]]*#[[:space:]]*"~\."|"~."|' /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"
