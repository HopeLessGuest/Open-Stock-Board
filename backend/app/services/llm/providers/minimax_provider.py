from __future__ import annotations

import time
import uuid
from typing import Any

import requests

from app.core.config import get_settings
from app.schemas import AIChatRequest, AIChatResponse, AIUsage
from app.services.llm.base import BaseLLMProvider, LLMProviderError, LLMProviderMeta


def _extract_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0] or {}
        message = first.get("message") if isinstance(first, dict) else None
        if isinstance(message, dict):
            content = message.get("content")
            if isinstance(content, str):
                return content
        text = first.get("text") if isinstance(first, dict) else None
        if isinstance(text, str):
            return text

    for key in ("reply", "output_text", "content"):
        value = payload.get(key)
        if isinstance(value, str):
            return value
    return ""


def _extract_usage(payload: dict[str, Any]) -> AIUsage | None:
    usage = payload.get("usage")
    if not isinstance(usage, dict):
        return None
    return AIUsage(
        prompt_tokens=usage.get("prompt_tokens"),
        completion_tokens=usage.get("completion_tokens"),
        total_tokens=usage.get("total_tokens"),
    )


class MiniMaxProvider(BaseLLMProvider):
    def __init__(self):
        self._settings = get_settings()

    @property
    def meta(self) -> LLMProviderMeta:
        return LLMProviderMeta(
            name="minimax",
            configured=bool(self._settings.minimax_api_key),
            default_model=self._settings.minimax_model,
        )

    def chat(self, request: AIChatRequest) -> AIChatResponse:
        if not self._settings.minimax_api_key:
            raise LLMProviderError("PROVIDER_NOT_CONFIGURED", "MiniMax API key not configured")

        model = request.model or self._settings.minimax_model
        base = self._settings.minimax_base_url.rstrip("/")
        path = self._settings.minimax_chat_path
        url = f"{base}{path}"

        headers = {
            "Authorization": f"Bearer {self._settings.minimax_api_key}",
            "Content-Type": "application/json",
        }
        if self._settings.minimax_group_id:
            headers["GroupId"] = self._settings.minimax_group_id

        payload = {
            "model": model,
            "messages": [message.model_dump() for message in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }
        payload = {k: v for k, v in payload.items() if v is not None}

        started = time.perf_counter()
        timeout = max(self._settings.llm_timeout_ms / 1000, 1)

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=timeout)
            response.raise_for_status()
            data = response.json()
        except requests.Timeout as exc:
            raise LLMProviderError("UPSTREAM_TIMEOUT", "MiniMax request timed out") from exc
        except requests.HTTPError as exc:
            message = f"MiniMax HTTP error: {exc.response.status_code if exc.response else 'unknown'}"
            raise LLMProviderError("UPSTREAM_HTTP_ERROR", message) from exc
        except requests.RequestException as exc:
            raise LLMProviderError("UPSTREAM_REQUEST_ERROR", "MiniMax request failed") from exc
        except ValueError as exc:
            raise LLMProviderError("UPSTREAM_INVALID_RESPONSE", "MiniMax returned invalid JSON") from exc

        content = _extract_content(data)
        elapsed_ms = int((time.perf_counter() - started) * 1000)

        return AIChatResponse(
            request_id=str(uuid.uuid4()),
            provider="minimax",
            model=model,
            content=content,
            usage=_extract_usage(data),
            latency_ms=elapsed_ms,
        )
