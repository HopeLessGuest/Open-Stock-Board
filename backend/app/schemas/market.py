from pydantic import BaseModel, Field


class QuoteItem(BaseModel):
    symbol: str = Field(..., description="Stock symbol, e.g. 600519")
    name: str
    currentPrice: float
    change: float
    changePercent: float
    open: float = 0
    high: float = 0
    low: float = 0
    volume: float = 0
    amount: float = 0
    marketCap: float = 0
    pe: float = 0
    pb: float = 0


class QuoteResponse(BaseModel):
    data: list[QuoteItem]
    degraded: bool = False
    message: str | None = None


class ChartPoint(BaseModel):
    date: str
    close: float
    yieldRate: float
    yieldAmount: float


class ChartResponse(BaseModel):
    data: list[ChartPoint]
    degraded: bool = False
    message: str | None = None


class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    publishTime: str
    relatedSymbols: list[str] | None = None
    sentiment: str = "neutral"
    category: str = "market"
    detailUrl: str | None = None


class NewsResponse(BaseModel):
    data: list[NewsItem]
    degraded: bool = False
    message: str | None = None


class IndustryItem(BaseModel):
    name: str
    changePercent: float
    change: float
    amount: float
    leadingStock: str
    leadingStockChange: float


class IndustryResponse(BaseModel):
    data: list[IndustryItem]
    degraded: bool = False
    message: str | None = None
