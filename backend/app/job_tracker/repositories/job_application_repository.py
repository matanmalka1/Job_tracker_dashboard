from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, update, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.job_tracker.models.job_application import JobApplication, ApplicationStatus
from app.job_tracker.models.email_reference import EmailReference


class JobApplicationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: dict) -> JobApplication:
        app = JobApplication(**data)
        self.session.add(app)
        await self.session.flush()
        return app

    async def get_by_id(self, application_id: int) -> Optional[JobApplication]:
        result = await self.session.execute(
            select(JobApplication)
            .options(selectinload(JobApplication.emails))
            .where(JobApplication.id == application_id)
        )
        return result.scalar_one_or_none()

    async def update(self, application_id: int, data: dict) -> Optional[JobApplication]:
        existing = await self.get_by_id(application_id)
        if not existing:
            return None

        # Only skip keys whose value is explicitly None; falsy values like ""
        # or 0 are legitimate updates the caller wants to persist.
        for key, value in data.items():
            if value is not None:
                setattr(existing, key, value)

        # Explicitly bump updated_at so the change is visible even if the async
        # driver's onupdate hook doesn't fire inside the same flush cycle.
        existing.updated_at = datetime.now(timezone.utc)

        await self.session.flush()
        return existing

    async def delete(self, application_id: int) -> bool:
        existing = await self.get_by_id(application_id)
        if not existing:
            return False
        await self.session.delete(existing)
        await self.session.flush()
        return True

    async def list_paginated(
        self,
        limit: int,
        offset: int,
        status: Optional[ApplicationStatus] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> tuple[list[JobApplication], int]:
        query = select(JobApplication).options(selectinload(JobApplication.emails))
        count_query = select(func.count()).select_from(JobApplication)

        if status:
            query = query.where(JobApplication.status == status)
            count_query = count_query.where(JobApplication.status == status)

        if search:
            pattern = f"%{search}%"
            search_filter = or_(
                JobApplication.company_name.ilike(pattern),
                JobApplication.role_title.ilike(pattern),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        sort_col = {
            "applied_at": JobApplication.applied_at.desc().nulls_last(),
            "company_name": JobApplication.company_name.asc(),
        }.get(sort or "", JobApplication.updated_at.desc())

        total = await self.session.scalar(count_query)
        result = await self.session.execute(
            query.order_by(sort_col).limit(limit).offset(offset)
        )
        return list(result.scalars().all()), total or 0

    async def get_stats(self) -> dict:
        """Return aggregated stats: total, counts by status, reply_rate."""
        # Count by status
        status_result = await self.session.execute(
            select(JobApplication.status, func.count().label("cnt"))
            .group_by(JobApplication.status)
        )
        by_status: dict[str, int] = {s.value: 0 for s in ApplicationStatus}
        total = 0
        for row in status_result.all():
            by_status[row[0].value] = row[1]
            total += row[1]

        # Count apps that have at least one linked email
        apps_with_email = await self.session.scalar(
            select(func.count(func.distinct(EmailReference.application_id)))
            .where(EmailReference.application_id.isnot(None))
        )
        reply_rate = (apps_with_email / total * 100) if total > 0 else 0.0

        return {"total": total, "by_status": by_status, "reply_rate": round(reply_rate, 1)}

    async def list_recent(self, limit: int = 10) -> list[JobApplication]:
        result = await self.session.execute(
            select(JobApplication)
            .options(selectinload(JobApplication.emails))
            .order_by(JobApplication.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update_last_email_at(self, application_id: int, received_at: datetime) -> None:
        await self.session.execute(
            update(JobApplication)
            .where(JobApplication.id == application_id)
            .where(
                (JobApplication.last_email_at == None)  # noqa: E711
                | (JobApplication.last_email_at < received_at)
            )
            .values(last_email_at=received_at)
        )