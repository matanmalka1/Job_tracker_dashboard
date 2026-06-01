from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.config import get_settings
from app.db import get_session
from app.job_tracker.api.deps import check_api_key, make_svc
from app.job_tracker.models.job_application import ApplicationStatus
from app.job_tracker.schemas.applications import (
    JobApplicationCreate,
    JobApplicationPage,
    JobApplicationRead,
    JobApplicationUpdate,
)

router = APIRouter()


@router.get("/applications", response_model=JobApplicationPage)
async def list_applications(
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None, max_length=200),
    sort: Optional[str] = Query(None, pattern="^(updated_at|created_at|applied_at|last_email_at|company_name|role_title|status)$"),
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    settings = get_settings()
    limit = limit if limit is not None else settings.PAGINATION_LIMIT_DEFAULT
    offset = offset if offset is not None else settings.PAGINATION_OFFSET_DEFAULT

    items, total = await make_svc(session).list_paginated(
        limit=limit, offset=offset, status=status_filter, search=search, sort=sort
    )
    return JobApplicationPage(
        total=total,
        items=[JobApplicationRead.model_validate(i) for i in items],
    )


@router.post("/applications", response_model=JobApplicationRead, status_code=status.HTTP_201_CREATED)
async def create_application(
    body: JobApplicationCreate,
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    app = await make_svc(session).create(body.model_dump())
    return JobApplicationRead.model_validate(app)


@router.get("/applications/{application_id}", response_model=JobApplicationRead)
async def get_application(
    application_id: int,
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    app = await make_svc(session).get_by_id(application_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return JobApplicationRead.model_validate(app)


@router.patch("/applications/{application_id}", response_model=JobApplicationRead)
async def update_application(
    application_id: int,
    body: JobApplicationUpdate,
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    app = await make_svc(session).update(application_id, body.model_dump(exclude_unset=True))
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return JobApplicationRead.model_validate(app)


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int,
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    deleted = await make_svc(session).delete(application_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")


@router.delete("/applications", status_code=status.HTTP_200_OK)
async def bulk_delete_applications(
    ids: list[int] = Query(..., description="Application IDs to delete"),
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    """Bulk-delete multiple applications. Returns deleted/not_found counts."""
    max_ids = get_settings().BULK_DELETE_MAX_IDS
    if not ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No IDs provided")
    if len(ids) > max_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete more than {max_ids} at once",
        )
    deleted_count, not_found = await make_svc(session).bulk_delete(ids)
    return {"deleted": deleted_count, "not_found": not_found}


@router.post(
    "/applications/{application_id}/emails/{email_id}",
    status_code=status.HTTP_200_OK,
)
async def assign_email_to_application(
    application_id: int,
    email_id: int,
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    ok = await make_svc(session).assign_email(application_id, email_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application or email not found",
        )
    return {"assigned": True}


@router.delete(
    "/applications/{application_id}/emails/{email_id}",
    status_code=status.HTTP_200_OK,
)
async def unassign_email_from_application(
    application_id: int,
    email_id: int,
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    ok = await make_svc(session).unassign_email(application_id, email_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found or not linked to this application",
        )
    return {"unassigned": True}
