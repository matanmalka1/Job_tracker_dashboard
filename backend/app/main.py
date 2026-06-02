import base64
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.health import router as health_router
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

    token_dir = os.path.dirname(token_file)
    if token_dir:
        os.makedirs(token_dir, exist_ok=True)
    with open(token_file, "w", opener=lambda path, flags: os.open(path, flags, 0o600)) as fh:
        fh.write(base64.b64decode(token_b64).decode())
    logger.info("Gmail token written to %s from GMAIL_TOKEN_JSON env var", token_file)


@asynccontextmanager
async def lifespan(_: FastAPI):
    _bootstrap_gmail_token()
    yield
    try:
        from app.job_tracker.services.emails.email_scan_service import shutdown_executor
        shutdown_executor()
    except Exception:
        logger.warning("Error shutting down executor", exc_info=True)


def create_app(lifespan_override=None) -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title="Job Dashboard API",
        description="Tracks job application emails from Gmail",
        version="1.0.0",
        lifespan=lifespan_override or lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health_router)
    application.include_router(job_tracker_router)

    _mount_frontend(application)

    return application


def _mount_frontend(application: FastAPI) -> None:
    """Serve the built React frontend when frontend/dist exists."""
    frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    frontend_dist = os.path.normpath(frontend_dist)
    if not os.path.isdir(frontend_dist):
        logger.info("Frontend dist not found at %s — skipping static mount (dev mode)", frontend_dist)
        return

    application.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_dist, "assets")),
        name="assets",
    )
    application.add_api_route(
        "/{full_path:path}",
        _spa_fallback(frontend_dist),
        methods=["GET"],
        include_in_schema=False,
    )
    logger.info("Serving frontend from %s", frontend_dist)


def _spa_fallback(frontend_dist: str):
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    return spa_fallback


app = create_app()
