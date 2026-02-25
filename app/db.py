from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()
engine = create_async_engine(_settings.DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


async def init_db() -> None:
    # Import models so metadata is populated before create_all
    import app.job_tracker.models  # noqa: F401

    # BUG FIX: always run create_all regardless of DB backend.
    # The old code only ran create_all for SQLite; Postgres/MySQL would start
    # with no tables and fail on the first request.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()