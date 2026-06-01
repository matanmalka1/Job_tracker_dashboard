"""Shared FastAPI dependencies and factory helpers used across all route modules."""
import logging
from typing import Optional

from fastapi import Header, HTTPException, status

from app.config import get_settings
from app.job_tracker.email_scanner.gmail_client import GmailClient
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
from app.job_tracker.services.job_application_service import JobApplicationService

logger = logging.getLogger(__name__)


async def check_api_key(x_api_key: Optional[str] = Header(None, alias="X-Api-Key")) -> None:
    """Optional API key guard. Skipped when JOB_TRACKER_API_KEY is not set."""
    required = get_settings().JOB_TRACKER_API_KEY
    if required and x_api_key != required:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")


def make_gmail_client(settings) -> GmailClient:
    return GmailClient(
        token_file=settings.GMAIL_TOKEN_FILE,
        delegated_user=settings.GMAIL_DELEGATED_USER,
        query_window_days=settings.GMAIL_QUERY_WINDOW_DAYS,
        max_messages=settings.GMAIL_MAX_MESSAGES,
        page_size=settings.GMAIL_LIST_PAGE_SIZE,
        batch_size=settings.GMAIL_BATCH_SIZE,
        retry_backoff_seconds=settings.GMAIL_RETRY_BACKOFF_SECONDS,
    )


def make_svc(session) -> JobApplicationService:
    return JobApplicationService(
        JobApplicationRepository(session),
        EmailReferenceRepository(session),
    )
