from fastapi import APIRouter, Depends, Query

from app.db import get_session
from app.job_tracker.api.deps import check_api_key, make_svc
from app.job_tracker.models.job_application import ApplicationStatus
from app.job_tracker.schemas.pipeline import PipelineColumnPage

router = APIRouter()

_MAX_PAGE_SIZE = 100
_DEFAULT_PAGE_SIZE = 20


@router.get("/applications/pipeline/column", response_model=PipelineColumnPage)
async def get_pipeline_column(
    status: ApplicationStatus = Query(..., description="Column status to fetch"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(_DEFAULT_PAGE_SIZE, ge=1, le=_MAX_PAGE_SIZE, description="Items per page"),
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    """Return a paginated page of cards for a single Kanban column."""
    return await make_svc(session).get_pipeline_column_page(status, page, page_size)
