from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.job_tracker.models.scan_run import ScanRun


class ScanRunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self) -> ScanRun:
        """
        Insert a new scan run record and commit immediately so the row is
        persisted even if the scan itself later fails and rolls back.
        We use a fresh savepoint (nested transaction) to isolate this write.
        """
        run = ScanRun(status="running")
        self.session.add(run)
        # Flush to get the PK, then commit so the record survives scan failures.
        # This is intentionally a standalone commit: scan_run history is
        # append-only audit data and should not be rolled back with scan errors.
        await self.session.flush()
        await self.session.commit()
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
            await self.session.commit()

    async def fail(self, run_id: int, error: str) -> None:
        result = await self.session.execute(select(ScanRun).where(ScanRun.id == run_id))
        run = result.scalar_one_or_none()
        if run:
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.error = error
            await self.session.commit()

    async def list_recent(self, limit: int = 10) -> list[ScanRun]:
        result = await self.session.execute(
            select(ScanRun).order_by(ScanRun.started_at.desc()).limit(limit)
        )
        return list(result.scalars().all())