"""In-memory sliding-window rate limiting (等保 2.0 资源控制).

Process-local: counters live in the uvicorn process memory, which is
sufficient for the single-worker deployment this project targets.
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request

from app.utils.request_ip import get_client_ip

_buckets: dict[str, deque[float]] = defaultdict(deque)


def rate_limit(scope: str, max_requests: int, window_seconds: int) -> Callable:
    """Build a FastAPI dependency that rejects requests exceeding the limit.

    The limit is applied per client IP within the given scope.
    """

    async def dependency(request: Request) -> None:
        key = f"{scope}:{get_client_ip(request)}"
        now = time.monotonic()
        bucket = _buckets[key]
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= max_requests:
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
        bucket.append(now)
        # key 含 IP 维度，无界增长时清扫掉整窗无请求的陈旧桶
        if len(_buckets) > 10_000:
            stale = [k for k, v in _buckets.items() if not v or now - v[-1] > window_seconds]
            for k in stale:
                del _buckets[k]

    return dependency
