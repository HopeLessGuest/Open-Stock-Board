import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import verify_api_key
from app.schemas import ChartResponse
from app.services import DataSourceUnavailableError, fetch_chart

router = APIRouter(prefix="/chart", tags=["chart"])
SYMBOL_RE = re.compile(r"^\d{6}$")


@router.get("", response_model=ChartResponse, dependencies=[Depends(verify_api_key)])
def get_chart(
    range: Literal["1d", "1w", "1m", "3m", "1y", "ytd"] = Query("1m"),
    symbol: str | None = Query(default=None),
):
    if symbol and not SYMBOL_RE.match(symbol.strip()):
        raise HTTPException(status_code=422, detail=f"Invalid symbol: {symbol}")

    try:
        data = fetch_chart(range, symbol)
        return {"data": data}
    except DataSourceUnavailableError as exc:
        return {"data": [], "degraded": True, "message": str(exc)}
