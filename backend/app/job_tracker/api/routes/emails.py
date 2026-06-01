from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.config import get_settings
from app.db import get_session
from app.job_tracker.api.deps import check_api_key
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
from app.job_tracker.schemas.email_reference import EmailReferencePage, EmailReferenceRead

router = APIRouter()


@router.get("/emails", response_model=EmailReferencePage)
async def list_emails(
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    settings = get_settings()
    limit = limit if limit is not None else settings.PAGINATION_LIMIT_DEFAULT
    offset = offset if offset is not None else settings.PAGINATION_OFFSET_DEFAULT

    repo = EmailReferenceRepository(session)
    items, total = await repo.list_paginated(limit=limit, offset=offset)
    return EmailReferencePage(total=total, items=[EmailReferenceRead.model_validate(i) for i in items])
