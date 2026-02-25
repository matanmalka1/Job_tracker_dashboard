import asyncio
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Optional

from app.job_tracker.email_scanner.gmail_client import GmailClient
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

logger = logging.getLogger(__name__)

# Broad keyword list: catch applications, rejections, offers, interviews, etc.
KEYWORDS = [
    "interview",
    "application",
    "thank you for applying",
    "applied",
    "recruiter",
    "recruiting",
    "hr",
    "human resources",
    "job offer",
    "offer letter",
    "unfortunately",
    "regret to inform",
    "pleased to inform",
    "moving forward",
    "next steps",
    "hiring",
    "position",
    "candidate",
    "background check",
    "onboarding",
    "start date",
]

_executor: Optional[ThreadPoolExecutor] = None
_executor_lock = threading.Lock()


def _matches_keywords(subject: str | None, snippet: str | None) -> bool:
    haystack = " ".join(filter(None, [subject, snippet])).lower()
    return any(keyword in haystack for keyword in KEYWORDS)


def _get_executor() -> ThreadPoolExecutor:
    """Return the shared executor, creating it thread-safely on first call."""
    global _executor
    if _executor is None or _executor._shutdown:
        with _executor_lock:
            # Double-checked locking: re-test inside the lock
            if _executor is None or _executor._shutdown:
                _executor = ThreadPoolExecutor(
                    max_workers=4,
                    thread_name_prefix="gmail-scan",
                )
    return _executor


def shutdown_executor() -> None:
    """Call on application shutdown to cleanly drain threads."""
    global _executor
    with _executor_lock:
        if _executor is not None:
            _executor.shutdown(wait=True)
            _executor = None


class EmailScanService:
    def __init__(self, gmail_client: GmailClient, repo: EmailReferenceRepository):
        self.gmail_client = gmail_client
        self.repo = repo

    async def scan_for_applications(self) -> int:
        loop = asyncio.get_running_loop()
        fetch_fn = partial(self.gmail_client.fetch_recent_messages)
        fetched_messages = await loop.run_in_executor(_get_executor(), fetch_fn)

        matched = [
            msg for msg in fetched_messages
            if _matches_keywords(msg.get("subject"), msg.get("snippet"))
        ]

        inserted, skipped = await self._bulk_insert(matched)

        logger.info(
            "Email scan completed: fetched=%s matched=%s inserted=%s skipped_duplicates=%s",
            len(fetched_messages),
            len(matched),
            inserted,
            skipped,
        )
        return inserted

    async def _bulk_insert(self, messages: list[dict]) -> tuple[int, int]:
        created, duplicates = await self.repo.bulk_create(messages)
        await self.repo.session.commit()
        return created, duplicates