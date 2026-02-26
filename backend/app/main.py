import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.db import init_db, get_session
from app.job_tracker.api.router import router as job_tracker_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield
    try:
        from app.job_tracker.services.email_scan_service import shutdown_executor
        shutdown_executor()
    except Exception:
        logger.warning("Error shutting down executor", exc_info=True)


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title="Job Dashboard API",
        description="Tracks job application emails from Gmail",
        version="1.0.0",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    # BUG FIX: CORS was missing entirely, causing all browser requests from the
    # Vite dev server (port 5173) to be blocked with CORS errors.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(job_tracker_router)
    return application


app = create_app()


@app.get("/health")
async def health(session=Depends(get_session)):
    try:
        await session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"DB unavailable: {exc}",
        )