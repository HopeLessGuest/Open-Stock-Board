from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import verify_api_key
from app.schemas import AIChatRequest, AIChatResponse, AIPlanRequest, AIProvidersResponse
from app.services.llm import LLMProviderError, LLMService

router = APIRouter(prefix="/ai", tags=["ai"])
llm_service = LLMService()


def _raise_provider_error(exc: LLMProviderError) -> None:
    error_code = exc.code
    if error_code in {"PROVIDER_NOT_FOUND"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": exc.code, "message": exc.message})
    if error_code in {"PROVIDER_NOT_CONFIGURED"}:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail={"code": exc.code, "message": exc.message})
    if error_code in {"UPSTREAM_TIMEOUT"}:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail={"code": exc.code, "message": exc.message})
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail={"code": exc.code, "message": exc.message})


@router.get("/providers", response_model=AIProvidersResponse, dependencies=[Depends(verify_api_key)])
def list_providers():
    return llm_service.providers()


@router.post("/chat", response_model=AIChatResponse, dependencies=[Depends(verify_api_key)])
def chat(request: AIChatRequest):
    try:
        return llm_service.chat(request)
    except LLMProviderError as exc:
        _raise_provider_error(exc)


@router.post("/plan", response_model=AIChatResponse, dependencies=[Depends(verify_api_key)])
def plan(request: AIPlanRequest):
    try:
        return llm_service.plan(request)
    except LLMProviderError as exc:
        _raise_provider_error(exc)
