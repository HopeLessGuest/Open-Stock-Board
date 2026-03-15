from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Open Stock Board API"
    app_env: str = "dev"
    app_debug: bool = False
    app_host: str = "127.0.0.1"
    app_port: int = 8790

    api_prefix: str = "/api/a-share"
    allowed_origins: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    trusted_hosts: List[str] = ["127.0.0.1", "localhost"]

    # If empty, API key auth is disabled for local dev.
    backend_api_key: str = ""

    # Lightweight in-memory rate limit: requests per minute per IP.
    rate_limit_per_minute: int = 120

    # LLM provider settings
    llm_default_provider: str = "minimax"
    llm_timeout_ms: int = 20000
    minimax_api_key: str = ""
    minimax_group_id: str = ""
    minimax_base_url: str = "https://api.minimax.chat"
    minimax_chat_path: str = "/v1/text/chatcompletion_v2"
    minimax_model: str = "MiniMax-Text-01"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("allowed_origins", "trusted_hosts", mode="before")
    @classmethod
    def parse_csv_list(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
