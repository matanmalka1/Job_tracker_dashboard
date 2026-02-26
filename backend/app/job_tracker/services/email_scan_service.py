import asyncio
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Optional

from sqlalchemy import select

from app.job_tracker.email_scanner.gmail_client import GmailClient
from app.job_tracker.models.email_reference import EmailReference
from app.job_tracker.models.job_application import ApplicationStatus, JobApplication
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
from app.job_tracker.services.application_matcher import match_email_to_application

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

# Subjects that indicate a new application was submitted — worth auto-creating a record
_APPLICATION_SUBJECT_PATTERNS = [
    # "Your application to <Role> at <Company>"
    re.compile(
        r"(?:your\s+)?application\s+(?:to|for)\s+(?P<role>.+?)\s+at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    # "Thanks for applying for <Role> at <Company>"
    re.compile(
        r"(?:thank(?:s|\s+you)\s+for\s+apply(?:ing)?(?:\s+for)?)\s+(?:the\s+)?(?P<role>.+?)\s+(?:position\s+)?at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    # "Thank you for applying to <Company>" — role unknown
    re.compile(
        r"thank(?:s|\s+you)\s+for\s+applying\s+to\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    # "<Name>, your application was sent to <Company>"
    re.compile(
        r"application\s+was\s+sent\s+to\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    # "Your application for <Role>" — sender domain becomes company
    re.compile(
        r"(?:your\s+)?application\s+for\s+(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]+?)(?:\s+has\s+been|\s+was|\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    # "We received your application for <Role> at <Company>"
    re.compile(
        r"(?:we\s+)?received\s+your\s+application\s+(?:for\s+(?P<role>.+?)\s+)?at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    # "Next steps for your application at <Company>"
    re.compile(
        r"next\s+steps?\s+(?:for\s+your\s+(?:application|candidacy)\s+)?at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    # "Interview invitation — <Company>"
    re.compile(
        r"interview\s+invitation[\s\-–—]+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)\s*[\-–—]+\s*(?:interview|phone\s+screen|technical\s+screen)",
        re.IGNORECASE,
    ),
    # "<Company> — <Role> — Application Received"
    re.compile(
        r"^(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]{2,40})\s*[\-–—:]\s*(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]{2,80})\s*[\-–—]\s*application",
        re.IGNORECASE,
    ),
]

# Status hints derived from subject keywords
_STATUS_HINTS: list[tuple[re.Pattern, ApplicationStatus]] = [
    (re.compile(r"\b(offer|congratulations|pleased to inform|job offer)\b", re.IGNORECASE), ApplicationStatus.OFFER),
    (re.compile(r"\b(interview|assessment|screening|schedule)\b", re.IGNORECASE), ApplicationStatus.INTERVIEWING),
    (re.compile(r"\b(unfortunately|regret|not moving forward|not selected|declined)\b", re.IGNORECASE), ApplicationStatus.REJECTED),
]

_executor: Optional[ThreadPoolExecutor] = None
_executor_lock = threading.Lock()


_EXCLUDE_PHRASES = [
    "wants to connect",
    "accepted your invitation",
    "joined your network",
    "now following you",
    "invitation to connect",
    "connect with",
    "people you may know",
    "grow your network",
    "new connection",
]


def _matches_keywords(subject: str | None, snippet: str | None) -> bool:
    haystack = " ".join(filter(None, [subject, snippet])).lower()
    if any(phrase in haystack for phrase in _EXCLUDE_PHRASES):
        return False
    return any(keyword in haystack for keyword in KEYWORDS)


def _extract_sender_domain(sender: str | None) -> str | None:
    """Extract bare domain from a sender like 'noreply@careers.acme.com' → 'Acme'."""
    if not sender:
        return None
    m = re.search(r"@([\w.\-]+)", sender)
    if not m:
        return None
    parts = m.group(1).lower().split(".")
    skip = {
        "mail", "email", "notification", "notifications", "noreply",
        "no-reply", "careers", "jobs", "comeet", "greenhouse", "lever",
        "workday", "bamboohr", "smartrecruiters", "taleo", "icims",
        "jobvite", "ashbyhq", "ashby", "rippling", "gusto", "myworkday",
        "successfactors", "oracle", "peoplesoft", "ultipro", "adp",
        "paychex", "zenefits", "breezy", "jazz", "applytojob",
        "hire", "recruiting", "workable", "pinpoint", "recruitee",
    }
    meaningful = [p for p in parts[:-1] if p not in skip]  # drop TLD
    if meaningful:
        return meaningful[-1].capitalize()
    first = parts[0] if parts else None
    if first and first not in skip:
        return first.capitalize()
    return None


def _infer_status(text: str) -> ApplicationStatus:
    for pattern, status in _STATUS_HINTS:
        if pattern.search(text):
            return status
    return ApplicationStatus.APPLIED


def _parse_application_from_email(email: EmailReference) -> Optional[dict]:
    """
    Try to extract company_name + role_title from an email subject.
    Returns a dict suitable for JobApplicationRepository.create(), or None.
    """
    subject = email.subject or ""
    snippet = email.snippet or ""
    haystack = f"{subject} {snippet}"

    for search_text in (subject, snippet):
        if not search_text:
            continue
        for pattern in _APPLICATION_SUBJECT_PATTERNS:
            m = pattern.search(search_text)
            if not m:
                continue
            groups = m.groupdict()
            company = groups.get("company", "").strip().rstrip(".,!")
            role = groups.get("role", "").strip().rstrip(".,!")

            if not company:
                company = _extract_sender_domain(email.sender) or "Unknown Company"

            # Log and skip suspiciously long matches — likely a bad regex capture
            if len(role) > 120:
                logger.warning(
                    "Role title exceeds 120 chars (%d), skipping: %r", len(role), role[:40]
                )
                continue
            if len(company) > 120:
                logger.warning(
                    "Company name exceeds 120 chars (%d), skipping: %r", len(company), company[:40]
                )
                continue

            if not company:
                continue

            return {
                "company_name": company,
                "role_title": role or None,
                "status": _infer_status(haystack),
                "source": "Gmail",
                "applied_at": email.received_at,
            }

    return None


def _extract_role_from_subjects(subjects: list[str | None]) -> str | None:
    for subject in subjects:
        if not subject:
            continue
        for pattern in _APPLICATION_SUBJECT_PATTERNS:
            m = pattern.search(subject)
            if m:
                role = m.groupdict().get("role", "").strip().rstrip(".,!")
                if role:
                    return role
    return None


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is None or _executor._shutdown:
        with _executor_lock:
            if _executor is None or _executor._shutdown:
                _executor = ThreadPoolExecutor(
                    max_workers=4,
                    thread_name_prefix="gmail-scan",
                )
    return _executor


def shutdown_executor() -> None:
    global _executor
    with _executor_lock:
        if _executor is not None:
            _executor.shutdown(wait=True)
            _executor = None


class EmailScanService:
    def __init__(
        self,
        gmail_client: GmailClient,
        repo: EmailReferenceRepository,
        app_repo: Optional[JobApplicationRepository] = None,
        scan_run_repo=None,
    ):
        self.gmail_client = gmail_client
        self.repo = repo
        self.app_repo = app_repo
        self.scan_run_repo = scan_run_repo

    async def scan_for_applications(
        self,
        on_progress: Optional[callable] = None,
    ) -> dict:
        """
        Returns {"inserted": int, "applications_created": int}.
        Calls on_progress(stage: str, detail: str) at key steps if provided.
        """
        scan_run_id: Optional[int] = None
        if self.scan_run_repo is not None:
            try:
                run = await self.scan_run_repo.create()
                scan_run_id = run.id
            except Exception:
                logger.warning("Could not record scan run start", exc_info=True)

        def emit(stage: str, detail: str = ""):
            if on_progress:
                on_progress(stage, detail)

        try:
            emit("fetching", "Connecting to Gmail…")
            loop = asyncio.get_running_loop()
            fetch_fn = partial(self.gmail_client.fetch_recent_messages)
            fetched_messages = await loop.run_in_executor(_get_executor(), fetch_fn)
            emit("fetching", f"Fetched {len(fetched_messages)} emails from Gmail")

            emit("filtering", "Filtering for job-related emails…")
            matched = [
                msg for msg in fetched_messages
                if _matches_keywords(msg.get("subject"), msg.get("snippet"))
            ]
            emit("filtering", f"Found {len(matched)} job-related emails")

            emit("saving", f"Saving {len(matched)} emails to database…")
            inserted, skipped = await self._bulk_insert(matched)
            emit("saving", f"Saved {inserted} new emails ({skipped} duplicates skipped)")

            applications_created = 0
            if self.app_repo is not None:
                emit("matching", "Matching emails to existing applications…")
                await self._match_unlinked_emails()
                emit("creating", "Auto-creating applications from email subjects…")
                applications_created = await self._auto_create_applications()
                emit("creating", f"Created {applications_created} new applications")

            emit("done", f"Scan complete — {inserted} emails · {applications_created} applications")

            logger.info(
                "Email scan completed: fetched=%s matched=%s inserted=%s skipped=%s apps_created=%s",
                len(fetched_messages),
                len(matched),
                inserted,
                skipped,
                applications_created,
            )

            if scan_run_id is not None and self.scan_run_repo is not None:
                try:
                    await self.scan_run_repo.complete(
                        scan_run_id,
                        emails_fetched=len(fetched_messages),
                        emails_inserted=inserted,
                        apps_created=applications_created,
                    )
                except Exception:
                    logger.warning("Could not record scan run completion", exc_info=True)

            return {"inserted": inserted, "applications_created": applications_created}

        except Exception as exc:
            if scan_run_id is not None and self.scan_run_repo is not None:
                try:
                    await self.scan_run_repo.fail(scan_run_id, str(exc))
                except Exception:
                    logger.warning("Could not record scan run failure", exc_info=True)
            raise

    async def _bulk_insert(self, messages: list[dict]) -> tuple[int, int]:
        created, duplicates = await self.repo.bulk_create(messages)
        await self.repo.session.commit()
        return created, duplicates

    async def _match_unlinked_emails(self) -> None:
        """Link unlinked EmailReference rows to existing JobApplications via heuristic matcher."""
        session = self.repo.session

        result = await session.execute(
            select(EmailReference).where(EmailReference.application_id.is_(None))
        )
        unlinked = result.scalars().all()
        if not unlinked:
            return

        apps_result = await session.execute(select(JobApplication))
        applications = apps_result.scalars().all()
        if not applications:
            return

        linked_count = 0
        for email in unlinked:
            best = match_email_to_application(email, applications)
            if best is not None:
                email.application_id = best.id
                await self.app_repo.update_last_email_at(best.id, email.received_at)
                linked_count += 1

        if linked_count:
            await session.commit()
            logger.info("Linked %s emails to existing applications", linked_count)

    async def _auto_create_applications(self) -> int:
        """
        For emails still unlinked after matching, try to parse a JobApplication
        from the subject line and create it, then link the email.
        Deduplicates by (company_name, role_title) — won't create the same
        application twice across multiple scans.

        FIX: Returns 0 (not None) when there are no unlinked emails.
        """
        session = self.repo.session

        result = await session.execute(
            select(EmailReference).where(EmailReference.application_id.is_(None))
        )
        still_unlinked = result.scalars().all()
        if not still_unlinked:
            return 0  # BUG FIX: was bare `return` (returns None), causing TypeError in caller

        apps_result = await session.execute(
            select(JobApplication.company_name, JobApplication.role_title)
        )
        existing_keys: set[tuple[str, str]] = {
            (row[0].lower(), row[1].lower()) for row in apps_result.all()
        }

        created_count = 0
        created_this_run: dict[tuple[str, str], JobApplication] = {}

        company_subjects: dict[str, list[str | None]] = {}
        for e in still_unlinked:
            parsed_peek = _parse_application_from_email(e)
            if parsed_peek and parsed_peek["company_name"]:
                ckey = parsed_peek["company_name"].lower()
                company_subjects.setdefault(ckey, []).append(e.subject)

        for email in still_unlinked:
            parsed = _parse_application_from_email(email)
            if not parsed:
                continue

            if not parsed["role_title"]:
                ckey = parsed["company_name"].lower()
                sibling_subjects = [s for s in company_subjects.get(ckey, []) if s != email.subject]
                parsed["role_title"] = _extract_role_from_subjects(sibling_subjects)
                if not parsed["role_title"]:
                    continue

            key = (parsed["company_name"].lower(), parsed["role_title"].lower())

            if key in existing_keys:
                apps_result2 = await session.execute(select(JobApplication))
                all_apps = apps_result2.scalars().all()
                best = match_email_to_application(email, all_apps)
                if best:
                    email.application_id = best.id
                    await self.app_repo.update_last_email_at(best.id, email.received_at)
                continue

            if key in created_this_run:
                app = created_this_run[key]
                email.application_id = app.id
                await self.app_repo.update_last_email_at(app.id, email.received_at)
                continue

            new_app = await self.app_repo.create(parsed)
            existing_keys.add(key)
            created_this_run[key] = new_app
            email.application_id = new_app.id
            await self.app_repo.update_last_email_at(new_app.id, email.received_at)
            created_count += 1

        if created_count or created_this_run:
            await session.commit()
            logger.info("Auto-created %s new job applications from emails", created_count)

        return created_count