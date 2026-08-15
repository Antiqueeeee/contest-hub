"""In-memory sliding-window rate limiting (等保 2.0 资源控制).

Process-local: counters live in the uvicorn process memory, which is
sufficient for the single-worker deployment this project targets.
"""

import os
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import HTTPException, Request

from app.utils.request_ip import get_client_ip

_buckets: dict[str, deque[float]] = defaultdict(deque)

# e2e 测试环境放宽限流（一套用例在 60 秒窗口内会真实触发登录/报名阈值）；
# 生产环境不设置该变量，倍率恒为 1。
RATE_LIMIT_MULTIPLIER = max(1, int(os.environ.get("RATE_LIMIT_MULTIPLIER", "1")))


def rate_limit(scope: str, max_requests: int, window_seconds: int,
               key_builder: Callable[[Request], Awaitable[str]] | None = None) -> Callable:
    """Build a FastAPI dependency that rejects requests exceeding the limit.

    The limit is applied per client IP within the given scope. 提供 key_builder
    时把其返回值附加到桶键上（如按报名编号分桶），避免 NAT/反向代理共享 IP
    下所有用户共用一个桶。
    """

    async def dependency(request: Request) -> None:
        suffix = ""
        if key_builder is not None:
            try:
                suffix = f":{await key_builder(request)}"
            except Exception:
                suffix = ":anon"
        key = f"{scope}:{get_client_ip(request)}{suffix}"
        now = time.monotonic()
        bucket = _buckets[key]
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= max_requests * RATE_LIMIT_MULTIPLIER:
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
        bucket.append(now)
        # key 含 IP 维度，无界增长时清扫掉整窗无请求的陈旧桶
        if len(_buckets) > 10_000:
            stale = [k for k, v in _buckets.items() if not v or now - v[-1] > window_seconds]
            for k in stale:
                del _buckets[k]

    return dependency
