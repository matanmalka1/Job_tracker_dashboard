import asyncio
import importlib
import importlib.util
import json
from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.db import get_session
from app.job_tracker.email_scanner.gmail_client import GmailClient
from app.job_tracker.models.job_application import ApplicationStatus
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
from app.job_tracker.schemas.email_reference import EmailReferencePage, EmailReferenceRead
from app.job_tracker.schemas.job_application import (
    JobApplicationCreate,
    JobApplicationPage,
    JobApplicationRead,
    JobApplicationUpdate,
)
from app.job_tracker.services.job_application_service import JobApplicationService


@lru_cache(maxsize=1)
def _resolve_auth_dep():
    """Return a FastAPI-compatible dependency for auth, or a no-op if app.auth is absent."""
    spec = importlib.util.find_spec("app.auth")
    if spec is None:
        async def _noop():
            return None
        return _noop

    module = importlib.import_module("app.auth")
    return getattr(module, "get_current_user", lambda: None)


router = APIRouter(prefix="/job-tracker", tags=["job-tracker"])

# NOTE: _resolve_auth_dep() is called here (at import time) intentionally —
# the resolved callable is what FastAPI wraps as a dependency per-request.
_auth_dep = _resolve_auth_dep()


# ─── Email endpoints ───────────────────────────────────────────────────────────

@router.get("/emails", response_model=EmailReferencePage)
async def list_emails(
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    settings = get_settings()
    limit = limit if limit is not None else settings.PAGINATION_LIMIT_DEFAULT
    offset = offset if offset is not None else settings.PAGINATION_OFFSET_DEFAULT

    repo = EmailReferenceRepository(session)
    items, total = await repo.list_paginated(limit=limit, offset=offset)
    return EmailReferencePage(total=total, items=[EmailReferenceRead.model_validate(i) for i in items])


@router.post("/scan", status_code=status.HTTP_202_ACCEPTED)
async def trigger_scan(
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    """Trigger a Gmail scan and store matching emails in the database."""
    repo = EmailReferenceRepository(session)
    settings = get_settings()

    client = GmailClient(
        token_file=settings.GMAIL_TOKEN_FILE,
        delegated_user=settings.GMAIL_DELEGATED_USER,
        query_window_days=settings.GMAIL_QUERY_WINDOW_DAYS,
        max_messages=settings.GMAIL_MAX_MESSAGES,
        page_size=settings.GMAIL_LIST_PAGE_SIZE,
    )
    try:
        from app.job_tracker.services.email_scan_service import EmailScanService

        app_repo = JobApplicationRepository(session)
        service = EmailScanService(client, repo, app_repo)
        result = await service.scan_for_applications()
        return result
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/scan/progress")
async def scan_progress(
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    """SSE endpoint: streams scan progress events then a final result."""
    settings = get_settings()
    client = GmailClient(
        token_file=settings.GMAIL_TOKEN_FILE,
        delegated_user=settings.GMAIL_DELEGATED_USER,
        query_window_days=settings.GMAIL_QUERY_WINDOW_DAYS,
        max_messages=settings.GMAIL_MAX_MESSAGES,
        page_size=settings.GMAIL_LIST_PAGE_SIZE,
    )

    queue: asyncio.Queue = asyncio.Queue()

    def on_progress(stage: str, detail: str):
        queue.put_nowait({"stage": stage, "detail": detail})

    async def event_stream():
        from app.job_tracker.services.email_scan_service import EmailScanService

        repo = EmailReferenceRepository(session)
        app_repo = JobApplicationRepository(session)
        service = EmailScanService(client, repo, app_repo)

        async def run_scan():
            try:
                result = await service.scan_for_applications(on_progress=on_progress)
                queue.put_nowait({"stage": "result", "detail": "", **result})
            except Exception as exc:
                queue.put_nowait({"stage": "error", "detail": str(exc)})

        scan_task = asyncio.create_task(run_scan())

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=60.0)
            except asyncio.TimeoutError:
                yield "data: {}\n\n"
                break

            yield f"data: {json.dumps(event)}\n\n"

            if event.get("stage") in ("result", "error"):
                break

        await scan_task

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Job Application endpoints ────────────────────────────────────────────────

@router.get("/applications", response_model=JobApplicationPage)
async def list_applications(
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    settings = get_settings()
    limit = limit if limit is not None else settings.PAGINATION_LIMIT_DEFAULT
    offset = offset if offset is not None else settings.PAGINATION_OFFSET_DEFAULT

    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)
    items, total = await svc.list_paginated(limit=limit, offset=offset, status=status_filter)
    return JobApplicationPage(
        total=total,
        items=[JobApplicationRead.model_validate(i) for i in items],
    )


@router.post("/applications", response_model=JobApplicationRead, status_code=status.HTTP_201_CREATED)
async def create_application(
    body: JobApplicationCreate,
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)
    app = await svc.create(body.model_dump())
    return JobApplicationRead.model_validate(app)


@router.get("/applications/{application_id}", response_model=JobApplicationRead)
async def get_application(
    application_id: int,
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)
    app = await svc.get_by_id(application_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return JobApplicationRead.model_validate(app)


@router.patch("/applications/{application_id}", response_model=JobApplicationRead)
async def update_application(
    application_id: int,
    body: JobApplicationUpdate,
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)
    # exclude_unset=True so that fields not provided are not patched;
    # exclude_none is intentionally NOT used here so callers can explicitly clear nullable fields.
    app = await svc.update(application_id, body.model_dump(exclude_unset=True))
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return JobApplicationRead.model_validate(app)


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int,
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)
    deleted = await svc.delete(application_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")


@router.post(
    "/applications/{application_id}/emails/{email_id}",
    status_code=status.HTTP_200_OK,
)
async def assign_email_to_application(
    application_id: int,
    email_id: int,
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    """Link an existing email reference to a job application."""
    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)
    ok = await svc.assign_email(application_id, email_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application or email not found",
        )
    return {"assigned": True}