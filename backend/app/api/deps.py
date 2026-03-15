from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


def verify_api_key(
    x_api_key: str | None = Security(api_key_header),
    bearer_credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> None:
    settings = get_settings()
    if not settings.backend_api_key:
        return

    bearer_token = bearer_credentials.credentials if bearer_credentials else None

    if x_api_key != settings.backend_api_key and bearer_token != settings.backend_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
