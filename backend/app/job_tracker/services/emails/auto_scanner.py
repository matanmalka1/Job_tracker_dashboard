"""Background auto-scan task.

Started from the FastAPI lifespan when SCAN_INTERVAL_HOURS > 0.
Uses the same EmailScanService as the manual /scan route.
"""

import asyncio
import logging

logger = logging.getLogger(__name__)


async def run_auto_scan_loop(interval_hours: float) -> None:
    """Sleep interval_hours, then run a scan, repeat forever."""
    interval_seconds = interval_hours * 3600
    logger.info("Auto-scan enabled: interval=%.1fh (%.0fs)", interval_hours, interval_seconds)

    while True:
        await asyncio.sleep(interval_seconds)

        try:
            await _do_scan()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Auto-scan failed; will retry after %.1fh", interval_hours)


async def _do_scan() -> None:
    from app.config import get_settings
    from app.db import get_session
    from app.job_tracker.api.deps import make_gmail_client
    from app.job_tracker.api.scan_rate_limit import acquire_scan_slot
    from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
    from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
    from app.job_tracker.repositories.scan_run_repository import ScanRunRepository
    from app.job_tracker.services.emails.email_scan_service import EmailScanService

    allowed, retry_after = await acquire_scan_slot()
    if not allowed:
        logger.info("Auto-scan skipped: rate-limited, retry in %.0fs", retry_after)
        return

    settings = get_settings()
    client = make_gmail_client(settings)

    async for session in get_session():
        service = EmailScanService(
            client,
            EmailReferenceRepository(session),
            JobApplicationRepository(session),
            ScanRunRepository(session),
        )
        result = await service.scan_for_applications()
        logger.info(
            "Auto-scan complete: inserted=%s apps_created=%s",
            result["inserted"],
            result["applications_created"],
        )
