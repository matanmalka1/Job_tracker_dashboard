from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite+aiosqlite:///./job_dashboard.db"
    GMAIL_SERVICE_ACCOUNT_FILE: str | None = None
    GMAIL_DELEGATED_USER: str | None = None
    GMAIL_TOKEN_FILE: str | None = None

    GMAIL_QUERY_WINDOW_DAYS: int = 30
    GMAIL_MAX_MESSAGES: int = 200
    GMAIL_LIST_PAGE_SIZE: int = 50
    PAGINATION_LIMIT_DEFAULT: int = 50
    PAGINATION_OFFSET_DEFAULT: int = 0

    # CORS: allow frontend dev server and common local ports.
    # Override with CORS_ORIGINS env var in production, e.g.:
    #   CORS_ORIGINS=["https://job-dashboard.onrender.com"]
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()