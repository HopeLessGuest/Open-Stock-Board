from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AIChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "tool"] = "user"
    content: str


class AIChatRequest(BaseModel):
    provider: str | None = None
    model: str | None = None
    messages: list[AIChatMessage] = Field(default_factory=list)
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1, le=8192)
    metadata: dict[str, Any] | None = None


class AIPlanRequest(BaseModel):
    provider: str | None = None
    model: str | None = None
    goal: str
    context: str | None = None
    constraints: list[str] = Field(default_factory=list)
    temperature: float | None = Field(default=0.2, ge=0, le=2)
    max_tokens: int | None = Field(default=1200, ge=1, le=8192)
    metadata: dict[str, Any] | None = None


class AIUsage(BaseModel):
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class AIChatResponse(BaseModel):
    request_id: str
    provider: str
    model: str
    content: str
    usage: AIUsage | None = None
    latency_ms: int


class AIProviderInfo(BaseModel):
    name: str
    configured: bool
    default_model: str | None = None


class AIProvidersResponse(BaseModel):
    default_provider: str
    providers: list[AIProviderInfo]
