import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    async def dispatch(self, request: Request, call_next):
        # Do not throttle docs and health checks.
        if (
            request.url.path.endswith("/health")
            or request.url.path.startswith("/docs")
            or request.url.path.startswith("/redoc")
            or request.url.path == "/openapi.json"
        ):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        with self._lock:
            bucket = self._requests[client_ip]
            # Sliding window of 60 seconds.
            while bucket and now - bucket[0] > 60:
                bucket.popleft()

            if len(bucket) >= self.requests_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded"},
                )

            bucket.append(now)

        return await call_next(request)
