from __future__ import annotations

from app.core.config import get_settings
from app.schemas import (
    AIChatMessage,
    AIChatRequest,
    AIChatResponse,
    AIPlanRequest,
    AIProviderInfo,
    AIProvidersResponse,
)
from app.services.llm.base import LLMProviderError
from app.services.llm.registry import ProviderRegistry


class LLMService:
    def __init__(self):
        self._settings = get_settings()
        self._registry = ProviderRegistry()

    def _resolve_provider(self, provider: str | None) -> str:
        return (provider or self._settings.llm_default_provider).lower()

    def chat(self, request: AIChatRequest) -> AIChatResponse:
        provider_name = self._resolve_provider(request.provider)
        provider = self._registry.get(provider_name)
        return provider.chat(request)

    def plan(self, request: AIPlanRequest) -> AIChatResponse:
        constraint_lines = "\n".join(f"- {item}" for item in request.constraints) if request.constraints else "- None"
        context = request.context or "None"
        user_prompt = (
            f"Goal:\n{request.goal}\n\n"
            f"Context:\n{context}\n\n"
            f"Constraints:\n{constraint_lines}\n\n"
            "Please return a concise implementation plan with: summary, step-by-step tasks, risks, and test checklist."
        )
        chat_request = AIChatRequest(
            provider=request.provider,
            model=request.model,
            messages=[
                AIChatMessage(role="system", content="You are a senior software architect."),
                AIChatMessage(role="user", content=user_prompt),
            ],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            metadata=request.metadata,
        )
        return self.chat(chat_request)

    def providers(self) -> AIProvidersResponse:
        metas = self._registry.list_meta()
        return AIProvidersResponse(
            default_provider=self._settings.llm_default_provider,
            providers=[
                AIProviderInfo(
                    name=meta.name,
                    configured=meta.configured,
                    default_model=meta.default_model,
                )
                for meta in metas
            ],
        )


__all__ = ["LLMService", "LLMProviderError"]
