import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.job_tracker.models.scan_run import ScanRun

logger = logging.getLogger(__name__)


class ScanRunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self) -> ScanRun:
        """
        Insert a new scan run record.

        BUG FIX: The original code called session.commit() here, which committed
        ALL pending changes in the shared session — not just the ScanRun row.
        This could accidentally commit partial application/email writes that
        should only commit after the full scan succeeds.

        Instead, we now only flush() to get the PK. The scan service is
        responsible for its own commit boundaries. The scan_run row will be
        committed when the service calls scan_run_repo.complete() or .fail().
        """
        run = ScanRun(status="running")
        self.session.add(run)
        await self.session.flush()
        return run

    async def complete(
        self,
        run_id: int,
        emails_fetched: int,
        emails_inserted: int,
        apps_created: int,
    ) -> None:
        result = await self.session.execute(select(ScanRun).where(ScanRun.id == run_id))
        run = result.scalar_one_or_none()
        if run:
            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
            run.emails_fetched = emails_fetched
            run.emails_inserted = emails_inserted
            run.apps_created = apps_created
            # NOTE: commit is handled by the caller (EmailScanService) so the
            # scan_run update is part of the same transaction as the email/app writes.
        else:
            logger.warning("ScanRun id=%s not found when trying to complete", run_id)

    async def fail(self, run_id: int, error: str) -> None:
        result = await self.session.execute(select(ScanRun).where(ScanRun.id == run_id))
        run = result.scalar_one_or_none()
        if run:
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.error = error[:2000]  # BUG FIX: truncate to avoid DB column overflow
        else:
            logger.warning("ScanRun id=%s not found when trying to fail", run_id)

    async def list_recent(self, limit: int = 10) -> list[ScanRun]:
        result = await self.session.execute(
            select(ScanRun).order_by(ScanRun.started_at.desc()).limit(limit)
        )
        return list(result.scalars().all())