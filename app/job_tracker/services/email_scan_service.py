import logging

from app.job_tracker.email_scanner.gmail_client import GmailClient
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

logger = logging.getLogger(__name__)

KEYWORDS = ["interview", "application", "thank you for applying", "hr", "recruiter"]


def _matches_keywords(subject: str | None, snippet: str | None) -> bool:
    haystack = " ".join(filter(None, [subject, snippet])).lower()
    return any(keyword in haystack for keyword in KEYWORDS)


class EmailScanService:
    def __init__(self, gmail_client: GmailClient, repo: EmailReferenceRepository):
        self.gmail_client = gmail_client
        self.repo = repo

    async def scan_for_applications(self):
        fetched_messages = self.gmail_client.fetch_recent_messages()
        matched = [msg for msg in fetched_messages if _matches_keywords(msg.get("subject"), msg.get("snippet"))]

        inserted = 0
        for msg in matched:
            record, created = await self.repo.create_from_raw_message(msg)
            if created:
                inserted += 1

        logger.info(
            "Email scan completed: fetched=%s matched=%s inserted=%s",
            len(fetched_messages),
            len(matched),
            inserted,
        )
        return inserted
