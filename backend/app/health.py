import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from app.db import get_session

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/ping")
async def ping():
    return {"status": "ok"}


@router.get("/health")
async def health(session=Depends(get_session)):
    try:
        await session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception:
        logger.exception("Health check failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable",
        )
