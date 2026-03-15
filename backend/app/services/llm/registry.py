from __future__ import annotations

from app.services.llm.base import BaseLLMProvider, LLMProviderError, LLMProviderMeta
from app.services.llm.providers.minimax_provider import MiniMaxProvider


class ProviderRegistry:
    def __init__(self):
        self._providers: dict[str, BaseLLMProvider] = {
            "minimax": MiniMaxProvider(),
        }

    def get(self, name: str) -> BaseLLMProvider:
        provider = self._providers.get(name.lower())
        if not provider:
            raise LLMProviderError("PROVIDER_NOT_FOUND", f"Unsupported provider: {name}")
        return provider

    def list_meta(self) -> list[LLMProviderMeta]:
        return [provider.meta for provider in self._providers.values()]
