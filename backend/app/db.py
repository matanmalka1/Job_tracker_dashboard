from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()
engine = create_async_engine(
    _settings.DATABASE_URL,
    echo=False,
    future=True,
    # BUG FIX: SQLite requires check_same_thread=False for async usage;
    # for aiosqlite this is handled automatically, but adding connect_args
    # makes it explicit and prevents issues with other drivers.
    connect_args={"check_same_thread": False} if "sqlite" in _settings.DATABASE_URL else {},
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db() -> None:
    import app.job_tracker.models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a database session.

    BUG FIX: The original implementation only called session.close() in the
    finally block, but never rolled back on errors. If a route handler raises
    an exception after a partial write, the session could be left in a dirty
    state and the next request might see uncommitted data or get a stale
    session error.  Rolling back on exception ensures a clean state.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()