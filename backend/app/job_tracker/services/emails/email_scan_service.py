import asyncio
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Optional

from app.job_tracker.email_scanner.gmail_client import GmailClient
from app.job_tracker.models.job_application import JobApplication
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
from app.job_tracker.repositories.scan_run_repository import ScanRunRepository
from app.job_tracker.services.emails.email_matcher import (
    match_email_to_application,
    matches_job_keywords,
)
from app.job_tracker.services.emails.email_parser import (
    extract_sender_domain,
    extract_role_from_subjects,
    infer_status,
    parse_application_from_email,
)

logger = logging.getLogger(__name__)

_executor: Optional[ThreadPoolExecutor] = None
_executor_lock = threading.Lock()


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is None or _executor._shutdown:
        with _executor_lock:
            if _executor is None or _executor._shutdown:
                from app.config import get_settings
                _executor = ThreadPoolExecutor(
                    max_workers=get_settings().SCAN_EXECUTOR_MAX_WORKERS,
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
        gmail_client: Optional[GmailClient],
        repo: EmailReferenceRepository,
        app_repo: Optional[JobApplicationRepository] = None,
        scan_run_repo: Optional[ScanRunRepository] = None,
    ):
        self.gmail_client = gmail_client
        self.repo = repo
        self.app_repo = app_repo
        self.scan_run_repo = scan_run_repo

    async def scan_for_applications(
        self,
        on_progress: Optional[Callable[[str, str], None]] = None,
    ) -> dict:
        """
        Returns {"inserted": int, "applications_created": int}.
        Calls on_progress(stage, detail) at key steps if provided.
        """
        scan_run_id: Optional[int] = None
        if self.scan_run_repo is not None:
            try:
                run = await self.scan_run_repo.create()
                # Commit immediately so ScanRun survives any later session.rollback()
                # (e.g. concurrent duplicate email insert in bulk_create).
                await self.scan_run_repo.session.commit()
                scan_run_id = run.id
            except Exception:
                logger.warning("Could not record scan run start", exc_info=True)

        def emit(stage: str, detail: str = "") -> None:
            if on_progress:
                try:
                    on_progress(stage, detail)
                except Exception:
                    logger.debug("on_progress callback raised", exc_info=True)

        try:
            emit("fetching", "Connecting to Gmail…")
            loop = asyncio.get_running_loop()
            fetched_messages = await loop.run_in_executor(_get_executor(), self.gmail_client.fetch_recent_messages)
            emit("fetching", f"Fetched {len(fetched_messages)} emails from Gmail")

            emit("filtering", "Filtering for job-related emails…")
            matched = [
                msg for msg in fetched_messages
                if matches_job_keywords(msg.get("subject"), msg.get("snippet"), msg.get("body_text"))
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
                    await self.repo.session.commit()
                except Exception:
                    logger.warning("Could not record scan run completion", exc_info=True)

            return {"inserted": inserted, "applications_created": applications_created}

        except Exception as exc:
            if scan_run_id is not None and self.scan_run_repo is not None:
                try:
                    await self.scan_run_repo.fail(scan_run_id, str(exc))
                    await self.repo.session.commit()
                except Exception:
                    logger.warning("Could not record scan run failure", exc_info=True)
            raise

    async def _bulk_insert(self, messages: list[dict]) -> tuple[int, int]:
        created, duplicates = await self.repo.bulk_create(messages)
        await self.repo.session.commit()
        return created, duplicates

    async def _match_unlinked_emails(self) -> None:
        """Link unlinked EmailReference rows to existing JobApplications via heuristic matcher."""
        unlinked = await self.repo.list_unlinked()
        if not unlinked:
            return

        applications = await self.app_repo.list_all()
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
            await self.repo.session.commit()
            logger.info("Linked %s emails to existing applications", linked_count)

    async def _auto_create_applications(self) -> int:
        """
        For unlinked emails, parse a JobApplication from subject/body and create it.
        Emails where company cannot be identified are left unlinked for manual review.
        Deduplicates by (company_name, role_title).
        """
        still_unlinked = await self.repo.list_unlinked()
        if not still_unlinked:
            return 0

        existing_keys = await self.app_repo.list_company_role_keys()
        all_apps = await self.app_repo.list_all()

        created_count = 0
        created_this_run: dict[tuple[str, str], JobApplication] = {}

        company_subjects: dict[str, list[str | None]] = {}
        for email in still_unlinked:
            parsed_peek = parse_application_from_email(email)
            if parsed_peek and parsed_peek["company_name"]:
                company_key = parsed_peek["company_name"].lower()
                company_subjects.setdefault(company_key, []).append(email.subject)

        for email in still_unlinked:
            parsed = parse_application_from_email(email)
            if not parsed:
                continue

            if not parsed["role_title"]:
                company_key = parsed["company_name"].lower()
                sibling_subjects = [s for s in company_subjects.get(company_key, []) if s != email.subject]
                parsed["role_title"] = extract_role_from_subjects(sibling_subjects)

            key = (parsed["company_name"].lower(), (parsed["role_title"] or "").lower())

            if key in existing_keys:
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
            all_apps = list(all_apps) + [new_app]
            existing_keys.add(key)
            created_this_run[key] = new_app
            email.application_id = new_app.id
            await self.app_repo.update_last_email_at(new_app.id, email.received_at)
            created_count += 1

        if created_count or any(email.application_id is not None for email in still_unlinked):
            await self.repo.session.commit()
            logger.info("Auto-created %s new job applications from emails", created_count)

        return created_count
