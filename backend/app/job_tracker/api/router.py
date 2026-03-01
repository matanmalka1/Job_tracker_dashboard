import asyncio
import importlib
import importlib.util
import json
import logging
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
from app.job_tracker.api.scan_rate_limit import acquire_scan_slot

logger = logging.getLogger(__name__)


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
_auth_dep = _resolve_auth_dep()


def _make_gmail_client(settings) -> GmailClient:
    return GmailClient(
        token_file=settings.GMAIL_TOKEN_FILE,
        delegated_user=settings.GMAIL_DELEGATED_USER,
        query_window_days=settings.GMAIL_QUERY_WINDOW_DAYS,
        max_messages=settings.GMAIL_MAX_MESSAGES,
        page_size=settings.GMAIL_LIST_PAGE_SIZE,
    )


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
    """Trigger a Gmail scan (rate-limited to once per 60 s)."""
    allowed, retry_after = await acquire_scan_slot()
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"A scan was run recently. Retry in {int(retry_after)}s.",
            headers={"Retry-After": str(int(retry_after))},
        )

    settings = get_settings()
    client = _make_gmail_client(settings)

    try:
        from app.job_tracker.services.email_scan_service import EmailScanService
        from app.job_tracker.repositories.scan_run_repository import ScanRunRepository

        repo = EmailReferenceRepository(session)
        app_repo = JobApplicationRepository(session)
        scan_run_repo = ScanRunRepository(session)
        service = EmailScanService(client, repo, app_repo, scan_run_repo)
        result = await service.scan_for_applications()
        return result
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.exception("Scan failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/scan/progress")
async def scan_progress(
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    """SSE endpoint: streams scan progress events then a final result."""
    allowed, retry_after = await acquire_scan_slot()
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"A scan was run recently. Retry in {int(retry_after)}s.",
            headers={"Retry-After": str(int(retry_after))},
        )

    settings = get_settings()
    client = _make_gmail_client(settings)
    queue: asyncio.Queue = asyncio.Queue()

    def on_progress(stage: str, detail: str):
        queue.put_nowait({"stage": stage, "detail": detail})

    async def event_stream():
        from app.job_tracker.services.email_scan_service import EmailScanService
        from app.job_tracker.repositories.scan_run_repository import ScanRunRepository

        repo = EmailReferenceRepository(session)
        app_repo = JobApplicationRepository(session)
        scan_run_repo = ScanRunRepository(session)
        service = EmailScanService(client, repo, app_repo, scan_run_repo)

        scan_task: Optional[asyncio.Task] = None

        async def run_scan():
            try:
                result = await service.scan_for_applications(on_progress=on_progress)
                queue.put_nowait({"stage": "result", "detail": "", **result})
            except Exception as exc:
                logger.exception("SSE scan failed")
                queue.put_nowait({"stage": "error", "detail": str(exc)})

        try:
            scan_task = asyncio.create_task(run_scan())

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=60.0)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    break

                yield f"data: {json.dumps(event)}\n\n"

                if event.get("stage") in ("result", "error"):
                    break
        finally:
            if scan_task is not None and not scan_task.done():
                scan_task.cancel()
                try:
                    await scan_task
                except (asyncio.CancelledError, Exception):
                    pass

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/scan/history")
async def scan_history(
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    """Return the last 10 scan runs."""
    from app.job_tracker.repositories.scan_run_repository import ScanRunRepository
    from app.job_tracker.schemas.scan_run import ScanRunRead
    repo = ScanRunRepository(session)
    runs = await repo.list_recent()
    return [ScanRunRead.model_validate(r) for r in runs]


# ─── Stats endpoint ────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    """Return pre-aggregated application statistics."""
    app_repo = JobApplicationRepository(session)
    return await app_repo.get_stats()


# ─── Job Application endpoints ────────────────────────────────────────────────

@router.get("/applications", response_model=JobApplicationPage)
async def list_applications(
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: Optional[int] = Query(None, ge=0),
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None, max_length=200),
    sort: Optional[str] = Query(None, pattern="^(updated_at|applied_at|last_email_at|company_name)$"),
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    settings = get_settings()
    limit = limit if limit is not None else settings.PAGINATION_LIMIT_DEFAULT
    offset = offset if offset is not None else settings.PAGINATION_OFFSET_DEFAULT

    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)
    items, total = await svc.list_paginated(
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


@router.delete("/applications", status_code=status.HTTP_200_OK)
async def bulk_delete_applications(
    ids: list[int] = Query(..., description="Application IDs to delete"),
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    """
    Bulk-delete multiple applications by ID.
    Returns counts of deleted and not-found records.
    """
    if not ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No IDs provided")
    if len(ids) > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete more than 100 at once")

    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)

    deleted_count = 0
    not_found = []
    for app_id in ids:
        ok = await svc.delete(app_id)
        if ok:
            deleted_count += 1
        else:
            not_found.append(app_id)

    # commit once after all deletes
    await svc._session.commit()
    return {"deleted": deleted_count, "not_found": not_found}


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


@router.delete(
    "/applications/{application_id}/emails/{email_id}",
    status_code=status.HTTP_200_OK,
)
async def unassign_email_from_application(
    application_id: int,
    email_id: int,
    session=Depends(get_session),
    _=Depends(_auth_dep),
):
    app_repo = JobApplicationRepository(session)
    email_repo = EmailReferenceRepository(session)
    svc = JobApplicationService(app_repo, email_repo)
    ok = await svc.unassign_email(application_id, email_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found or not linked to this application",
        )
    return {"unassigned": True}