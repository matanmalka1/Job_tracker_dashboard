from functools import lru_cache
import os
from typing import Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file_encoding="utf-8", extra="ignore")

    # ── Runtime ───────────────────────────────────────────────────────────────
    APP_ENV: str = "development"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/job_dashboard"

    # ── Gmail OAuth ───────────────────────────────────────────────────────────
    GMAIL_TOKEN_FILE: str | None = None
    GMAIL_DELEGATED_USER: str | None = None  # mailbox to scan; None → "me"

    # ── Gmail fetch tuning ────────────────────────────────────────────────────
    GMAIL_QUERY_WINDOW_DAYS: int = 30
    GMAIL_MAX_MESSAGES: int = 200
    GMAIL_LIST_PAGE_SIZE: int = 50
    GMAIL_BATCH_SIZE: int = 100           # messages per Gmail batch-get request
    GMAIL_RETRY_BACKOFF_SECONDS: int = 2  # wait before retrying 429-throttled msgs

    # ── Scan behaviour ────────────────────────────────────────────────────────
    SCAN_RATE_LIMIT_SECONDS: int = 10     # minimum gap between scans
    SCAN_EXECUTOR_MAX_WORKERS: int = 4    # thread-pool workers for Gmail I/O
    SSE_KEEPALIVE_TIMEOUT: float = 60.0   # seconds before SSE keepalive is sent
    SCAN_HISTORY_LIMIT: int = 10          # rows returned by /scan/history

    # ── API limits ────────────────────────────────────────────────────────────
    PAGINATION_LIMIT_DEFAULT: int = 50
    PAGINATION_OFFSET_DEFAULT: int = 0
    BULK_DELETE_MAX_IDS: int = 100        # max IDs accepted by bulk-delete
    ERROR_TRUNCATE_LENGTH: int = 2000     # max chars stored in scan_run.error

    # ── API key guard ─────────────────────────────────────────────────────────
    # Set JOB_TRACKER_API_KEY to require X-Api-Key header on all /job-tracker routes.
    # When unset, the guard is disabled (local dev default).
    JOB_TRACKER_API_KEY: str | None = None

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_async_database_url(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @model_validator(mode="after")
    def validate_production_database(self) -> "Settings":
        if self.APP_ENV.lower() == "production" and self.DATABASE_URL.startswith("sqlite"):
            raise ValueError("Production DATABASE_URL must point to PostgreSQL, not SQLite.")
        return self


def _settings_env_file() -> str | None:
    if env_file := os.environ.get("ENV_FILE"):
        return env_file
    if os.environ.get("APP_ENV", "development").lower() == "production":
        return None
    return ".env"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(_env_file=_settings_env_file())
