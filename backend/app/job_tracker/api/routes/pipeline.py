from fastapi import APIRouter, Depends

from app.db import get_session
from app.job_tracker.api.deps import check_api_key, make_svc
from app.job_tracker.schemas.pipeline import PipelineRead

router = APIRouter()


@router.get("/applications/pipeline", response_model=PipelineRead)
async def get_pipeline(
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    """Return all applications grouped by status for the Kanban board."""
    return await make_svc(session).get_pipeline()
