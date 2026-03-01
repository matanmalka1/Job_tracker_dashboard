import base64
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import get_settings
from app.db import init_db, get_session
from app.job_tracker.api.router import router as job_tracker_router

logger = logging.getLogger(__name__)


def _bootstrap_gmail_token() -> None:
    """Write Gmail token from GMAIL_TOKEN_JSON env var (base64-encoded) to disk.

    On Render (or any container environment) secrets can't be files, so we
    store the token JSON as a base64 string in the environment and write it to
    GMAIL_TOKEN_FILE at startup.  If the file already exists we leave it alone
    so a refreshed token isn't overwritten on every restart.
    """
    token_b64 = os.environ.get("GMAIL_TOKEN_JSON")
    token_file = os.environ.get("GMAIL_TOKEN_FILE")

    if not token_b64 or not token_file:
        return  # nothing to do (local dev or scanning not configured)

    if os.path.exists(token_file):
        return  # already written (e.g. refreshed token survives within the same dyno)

    os.makedirs(os.path.dirname(token_file), exist_ok=True)
    with open(token_file, "w") as fh:
        fh.write(base64.b64decode(token_b64).decode())
    logger.info("Gmail token written to %s from GMAIL_TOKEN_JSON env var", token_file)


@asynccontextmanager
async def lifespan(_: FastAPI):
    _bootstrap_gmail_token()
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

    # Serve the built React frontend.
    # In production the frontend is built into ../frontend/dist relative to
    # the backend/ directory (i.e. the repo root's frontend/dist).
    # We mount it AFTER all API routes so API paths are never shadowed.
    _frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    _frontend_dist = os.path.normpath(_frontend_dist)
    if os.path.isdir(_frontend_dist):
        application.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
        logger.info("Serving frontend from %s", _frontend_dist)
    else:
        logger.info("Frontend dist not found at %s — skipping static mount (dev mode)", _frontend_dist)

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