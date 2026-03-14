import re

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import verify_api_key
from app.schemas import QuoteResponse
from app.services import DataSourceUnavailableError, fetch_quotes

router = APIRouter(prefix="/quotes", tags=["quotes"])

SYMBOL_RE = re.compile(r"^\d{6}$")


@router.get("", response_model=QuoteResponse, dependencies=[Depends(verify_api_key)])
def get_quotes(symbols: str = Query(..., description="Comma-separated symbols, e.g. 600519,000858")):
    symbol_list = [item.strip() for item in symbols.split(",") if item.strip()]
    invalid = [item for item in symbol_list if not SYMBOL_RE.match(item)]
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid symbols: {', '.join(invalid)}")

    try:
        data = fetch_quotes(symbol_list)
        return {"data": data}
    except DataSourceUnavailableError as exc:
        return {"data": [], "degraded": True, "message": str(exc)}
