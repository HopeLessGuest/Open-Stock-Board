from fastapi import APIRouter, Depends, Query

from app.api.deps import verify_api_key
from app.schemas import NewsResponse
from app.services import DataSourceUnavailableError, fetch_news

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=NewsResponse, dependencies=[Depends(verify_api_key)])
def get_news(limit: int = Query(default=20, ge=1, le=100)):
    try:
        data = fetch_news(limit=limit)
        return {"data": data}
    except DataSourceUnavailableError as exc:
        return {"data": [], "degraded": True, "message": str(exc)}
