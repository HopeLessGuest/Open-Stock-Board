from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.schemas import AIChatRequest, AIChatResponse


class LLMProviderError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class LLMProviderMeta:
    name: str
    configured: bool
    default_model: str | None


class BaseLLMProvider(ABC):
    @property
    @abstractmethod
    def meta(self) -> LLMProviderMeta:
        raise NotImplementedError

    @abstractmethod
    def chat(self, request: AIChatRequest) -> AIChatResponse:
        raise NotImplementedError
