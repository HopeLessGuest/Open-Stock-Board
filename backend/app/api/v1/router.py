from fastapi import APIRouter

from app.api.v1.endpoints.chart import router as chart_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.industries import router as industries_router
from app.api.v1.endpoints.news import router as news_router
from app.api.v1.endpoints.quotes import router as quotes_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(quotes_router)
api_v1_router.include_router(chart_router)
api_v1_router.include_router(news_router)
api_v1_router.include_router(industries_router)
