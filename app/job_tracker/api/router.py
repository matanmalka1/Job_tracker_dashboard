import importlib
import importlib.util
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import get_settings
from app.db import get_session
from app.job_tracker.email_scanner.gmail_client import GmailClient
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
from app.job_tracker.schemas.email_reference import EmailReferencePage, EmailReferenceRead


@lru_cache(maxsize=1)
def _resolve_auth_dep():
    """Return a FastAPI-compatible dependency function for auth, or a no-op if app.auth is absent."""
    spec = importlib.util.find_spec("app.auth")
    if spec is None:
        async def _noop():
            return None
        return _noop

    module = importlib.import_module("app.auth")
    return getattr(module, "get_current_user", lambda: None)


router = APIRouter(prefix="/job-tracker", tags=["job-tracker"])


@router.get("/emails", response_model=EmailReferencePage)
async def list_emails(
    limit: int | None = None,
    offset: int | None = None,
    session=Depends(get_session),
    _=Depends(_resolve_auth_dep()),
):
    settings = get_settings()
    limit = limit if limit is not None else settings.PAGINATION_LIMIT_DEFAULT
    offset = offset if offset is not None else settings.PAGINATION_OFFSET_DEFAULT

    repo = EmailReferenceRepository(session)
    items, total = await repo.list_paginated(limit=limit, offset=offset)
    return EmailReferencePage(total=total, items=[EmailReferenceRead.model_validate(i) for i in items])


@router.post("/scan", status_code=status.HTTP_202_ACCEPTED)
async def trigger_scan(session=Depends(get_session), _=Depends(_resolve_auth_dep())):
    repo = EmailReferenceRepository(session)
    settings = get_settings()

    # BUG FIX: use GMAIL_TOKEN_FILE (OAuth token) not GMAIL_SERVICE_ACCOUNT_FILE,
    # because GmailClient calls Credentials.from_authorized_user_file internally.
    client = GmailClient(
        token_file=settings.GMAIL_TOKEN_FILE,
        delegated_user=settings.GMAIL_DELEGATED_USER,
        query_window_days=settings.GMAIL_QUERY_WINDOW_DAYS,
        max_messages=settings.GMAIL_MAX_MESSAGES,
        page_size=settings.GMAIL_LIST_PAGE_SIZE,
    )
    try:
        from app.job_tracker.services.email_scan_service import EmailScanService

        service = EmailScanService(client, repo)
        inserted = await service.scan_for_applications()
        return {"inserted": inserted}
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))