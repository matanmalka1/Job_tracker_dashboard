from fastapi import APIRouter, Depends

from app.db import get_session
from app.job_tracker.api.deps import check_api_key, make_svc

router = APIRouter()


@router.get("/stats")
async def get_stats(
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    return await make_svc(session).get_stats()
