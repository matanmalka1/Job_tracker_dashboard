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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()