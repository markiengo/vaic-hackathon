"""OpenAI-compatible DeepSeek client configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash"
DEFAULT_OPENROUTER_DEEPSEEK_MODEL = "deepseek/deepseek-v4-flash"
DEFAULT_DETERMINISTIC_TEMPERATURE = 0.1
DEFAULT_MESSAGE_DRAFT_TEMPERATURE = 0.3
DEFAULT_PLANNER_THINKING_ENABLED = True


def _load_dotenv_if_available() -> None:
    """Load local env files in development without making dotenv a hard import."""

    try:
        from dotenv import load_dotenv
    except ModuleNotFoundError:
        return

    backend_dir = Path(__file__).resolve().parents[2]
    for env_file in (Path.cwd() / ".env", backend_dir / ".env"):
        load_dotenv(env_file, override=False)


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value


def _env_bool(name: str, default: bool) -> bool:
    value = _env(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class DeepSeekClientSettings:
    """Runtime settings for the OpenAI-compatible LLM client."""

    api_key: str
    base_url: str = DEEPSEEK_BASE_URL
    model: str = DEFAULT_DEEPSEEK_MODEL
    deterministic_temperature: float = DEFAULT_DETERMINISTIC_TEMPERATURE
    message_draft_temperature: float = DEFAULT_MESSAGE_DRAFT_TEMPERATURE
    planner_thinking_enabled: bool = DEFAULT_PLANNER_THINKING_ENABLED


def get_deepseek_settings() -> DeepSeekClientSettings:
    """Load DeepSeek/OpenRouter-compatible client settings from environment."""

    _load_dotenv_if_available()

    deepseek_key = _env("DEEPSEEK_API_KEY")
    openrouter_key = _env("OPENROUTER_API_KEY")
    api_key = deepseek_key or openrouter_key

    if not api_key:
        raise RuntimeError("Set DEEPSEEK_API_KEY or OPENROUTER_API_KEY before using the LLM client.")

    using_openrouter = deepseek_key is None and openrouter_key is not None
    default_base_url = OPENROUTER_BASE_URL if using_openrouter else DEEPSEEK_BASE_URL
    default_model = DEFAULT_OPENROUTER_DEEPSEEK_MODEL if using_openrouter else DEFAULT_DEEPSEEK_MODEL

    return DeepSeekClientSettings(
        api_key=api_key,
        base_url=_env("DEEPSEEK_BASE_URL", default_base_url) or default_base_url,
        model=_env("DEEPSEEK_MODEL", default_model) or default_model,
        deterministic_temperature=float(
            _env("DEEPSEEK_TEMPERATURE", str(DEFAULT_DETERMINISTIC_TEMPERATURE))
            or str(DEFAULT_DETERMINISTIC_TEMPERATURE)
        ),
        message_draft_temperature=float(
            _env("DEEPSEEK_MESSAGE_TEMPERATURE", str(DEFAULT_MESSAGE_DRAFT_TEMPERATURE))
            or str(DEFAULT_MESSAGE_DRAFT_TEMPERATURE)
        ),
        planner_thinking_enabled=_env_bool(
            "DEEPSEEK_PLANNER_THINKING_ENABLED",
            DEFAULT_PLANNER_THINKING_ENABLED,
        ),
    )


def create_deepseek_client(settings: DeepSeekClientSettings | None = None) -> Any:
    """Create an OpenAI SDK client pointed at a DeepSeek-compatible endpoint."""

    from openai import OpenAI

    resolved_settings = settings or get_deepseek_settings()
    return OpenAI(api_key=resolved_settings.api_key, base_url=resolved_settings.base_url)


def create_test_prompt_response(prompt: str = "Reply with JSON: {\"ok\": true}") -> str:
    """Small smoke-test helper for validating provider connectivity."""

    settings = get_deepseek_settings()
    client = create_deepseek_client(settings)
    response = client.chat.completions.create(
        model=settings.model,
        temperature=settings.deterministic_temperature,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a concise JSON-only test assistant. Always answer in Vietnamese "
                    "for human-readable values. Keep JSON keys unchanged."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content or ""


__all__ = [
    "DEEPSEEK_BASE_URL",
    "OPENROUTER_BASE_URL",
    "DEFAULT_DETERMINISTIC_TEMPERATURE",
    "DEFAULT_DEEPSEEK_MODEL",
    "DEFAULT_MESSAGE_DRAFT_TEMPERATURE",
    "DEFAULT_OPENROUTER_DEEPSEEK_MODEL",
    "DEFAULT_PLANNER_THINKING_ENABLED",
    "DeepSeekClientSettings",
    "get_deepseek_settings",
    "create_deepseek_client",
    "create_test_prompt_response",
]
