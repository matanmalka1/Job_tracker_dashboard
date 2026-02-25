from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.db import init_db
from app.job_tracker.api.router import router as job_tracker_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield
    from app.job_tracker.services.email_scan_service import shutdown_executor
    shutdown_executor()


app = FastAPI(
    title="Job Dashboard API",
    description="Tracks job application emails from Gmail",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(job_tracker_router)


@app.get("/health")
async def health():
    return {"status": "ok"}