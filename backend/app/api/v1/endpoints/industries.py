from fastapi import APIRouter, Depends, Query

from app.api.deps import verify_api_key
from app.schemas import IndustryResponse
from app.services import DataSourceUnavailableError, fetch_industries

router = APIRouter(prefix="/industries", tags=["industries"])


@router.get("", response_model=IndustryResponse, dependencies=[Depends(verify_api_key)])
def get_industries(limit: int = Query(default=20, ge=1, le=100)):
    try:
        data = fetch_industries(limit=limit)
        return {"data": data}
    except DataSourceUnavailableError as exc:
        return {"data": [], "degraded": True, "message": str(exc)}
