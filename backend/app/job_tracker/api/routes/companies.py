from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.config import get_settings
from app.db import get_session
from app.job_tracker.api.deps import check_api_key, make_svc
from app.job_tracker.schemas.companies import CompanySummaryPage

router = APIRouter()


@router.get("/companies/summary", response_model=CompanySummaryPage)
async def get_companies_summary(
    search: Optional[str] = Query(None, max_length=200),
    limit: Optional[int] = Query(None, ge=1, le=200),
    offset: Optional[int] = Query(None, ge=0),
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    """Return paginated companies summary grouped by company_name."""
    settings = get_settings()
    limit = limit if limit is not None else settings.PAGINATION_LIMIT_DEFAULT
    offset = offset if offset is not None else settings.PAGINATION_OFFSET_DEFAULT
    return await make_svc(session).get_companies_summary(search=search, limit=limit, offset=offset)
