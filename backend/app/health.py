from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from app.db import get_session

router = APIRouter()


@router.get("/health")
async def health(session=Depends(get_session)):
    try:
        await session.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"DB unavailable: {exc}",
        )
