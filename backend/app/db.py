from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


_settings = get_settings()
engine = create_async_engine(
    _settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db() -> None:
    import app.job_tracker.models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_schema_compat)


def _ensure_schema_compat(sync_conn) -> None:
    """Apply tiny additive schema fixes for installs that predate migrations."""
    inspector = inspect(sync_conn)
    if "email_references" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("email_references")}
    if "body_text" in columns:
        return

    dialect = sync_conn.dialect.name
    if dialect == "postgresql":
        sync_conn.execute(text("ALTER TABLE email_references ADD COLUMN IF NOT EXISTS body_text TEXT"))
    else:
        sync_conn.execute(text("ALTER TABLE email_references ADD COLUMN body_text TEXT"))


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
