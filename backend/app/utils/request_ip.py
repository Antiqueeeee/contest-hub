"""Client IP extraction for rate limiting, lockout and audit logs.

部署拓扑：client → [外层 nginx] → 项目内 nginx → uvicorn（--proxy-headers）。
每层代理以 append 模式写 X-Forwarded-For，因此：

- 最左端是客户端自报的值，**可以任意伪造**，不能用于安全控制；
- 最右端是本项目可信代理追加的值。单层代理（docker compose 默认部署）
  下最右端即真实客户端 IP；有外层 nginx 时最右端是外层代理 IP，
  此时 IP 级控制退化为对代理生效（fail-closed），但仍不可被客户端伪造。
"""

from fastapi import Request


def get_client_ip(request: Request) -> str:
    """Return the rightmost X-Forwarded-For entry, falling back to the peer address."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else ""
