from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def db_session():
    """Yield a fresh async session backed by an in-memory SQLite database."""
    import app.job_tracker.models  # noqa: F401 — registers models on Base
    from app.db import Base

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    """FastAPI test client wired to the in-memory DB session, lifespan skipped."""
    from app.db import get_session
    from app.main import create_app

    @asynccontextmanager
    async def _noop_lifespan(_):
        yield

    test_app = create_app(lifespan_override=_noop_lifespan)
    async def _override_session():
        yield db_session

    test_app.dependency_overrides[get_session] = _override_session

    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
        yield ac

    test_app.dependency_overrides.clear()
