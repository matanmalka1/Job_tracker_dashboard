import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import utcnow
from app.job_tracker.models.scan_run import ScanRun

logger = logging.getLogger(__name__)


class ScanRunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self) -> ScanRun:
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
        run = await self.session.scalar(select(ScanRun).where(ScanRun.id == run_id))
        if run:
            run.status = "completed"
            run.completed_at = utcnow()
            run.emails_fetched = emails_fetched
            run.emails_inserted = emails_inserted
            run.apps_created = apps_created
        else:
            logger.warning("ScanRun id=%s not found when trying to complete", run_id)

    async def fail(self, run_id: int, error: str) -> None:
        run = await self.session.scalar(select(ScanRun).where(ScanRun.id == run_id))
        if run:
            run.status = "failed"
            run.completed_at = utcnow()
            run.error = error[: get_settings().ERROR_TRUNCATE_LENGTH]
        else:
            logger.warning("ScanRun id=%s not found when trying to fail", run_id)

    async def list_recent(self, limit: int = 10) -> list[ScanRun]:
        result = await self.session.execute(
            select(ScanRun).order_by(ScanRun.started_at.desc()).limit(limit)
        )
        return list(result.scalars().all())
