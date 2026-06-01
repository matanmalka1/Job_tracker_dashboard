from datetime import datetime
from typing import Optional

from sqlalchemy import delete, select, func, update, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import utcnow
from app.job_tracker.models.job_application import JobApplication, ApplicationStatus


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

        for key, value in data.items():
            setattr(existing, key, value)

        existing.updated_at = utcnow()
        await self.session.flush()
        return existing

    async def delete(self, application_id: int) -> bool:
        existing = await self.get_by_id(application_id)
        if not existing:
            return False
        await self.session.delete(existing)
        await self.session.flush()
        return True

    async def bulk_delete(self, ids: list[int]) -> tuple[int, list[int]]:
        """Delete multiple applications by ID. Returns (deleted_count, not_found_ids)."""
        if not ids:
            return 0, []
        existing_result = await self.session.execute(
            select(JobApplication.id).where(JobApplication.id.in_(ids))
        )
        found_ids = set(existing_result.scalars().all())
        not_found = [i for i in ids if i not in found_ids]
        if found_ids:
            await self.session.execute(
                delete(JobApplication).where(JobApplication.id.in_(found_ids))
            )
            await self.session.flush()
        return len(found_ids), not_found

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

        _sort_map = {
            "updated_at": JobApplication.updated_at.desc(),
            "applied_at": JobApplication.applied_at.desc().nulls_last(),
            "last_email_at": JobApplication.last_email_at.desc().nulls_last(),
            "company_name": JobApplication.company_name.asc(),
        }
        sort_col = _sort_map.get(sort or "", JobApplication.last_email_at.desc().nulls_last())

        total = await self.session.scalar(count_query)
        result = await self.session.execute(
            query.order_by(sort_col).limit(limit).offset(offset)
        )
        return list(result.scalars().all()), total or 0

    async def get_stats(self) -> dict:
        """Return aggregated stats: total, counts by status, reply_rate."""
        status_result = await self.session.execute(
            select(JobApplication.status, func.count().label("cnt"))
            .group_by(JobApplication.status)
        )
        by_status: dict[str, int] = {s.value: 0 for s in ApplicationStatus}
        total = 0
        for row in status_result.all():
            key = row[0].value if isinstance(row[0], ApplicationStatus) else str(row[0])
            if key in by_status:
                by_status[key] = row[1]
                total += row[1]

        responded_statuses = [
            ApplicationStatus.INTERVIEWING,
            ApplicationStatus.OFFER,
            ApplicationStatus.HIRED,
            ApplicationStatus.REJECTED,
        ]
        apps_with_response = await self.session.scalar(
            select(func.count())
            .select_from(JobApplication)
            .where(JobApplication.status.in_(responded_statuses))
        )
        reply_rate = (apps_with_response / total * 100) if total > 0 else 0.0

        return {"total": total, "by_status": by_status, "reply_rate": round(reply_rate, 1)}

    async def list_all(self) -> list[JobApplication]:
        result = await self.session.execute(select(JobApplication))
        return list(result.scalars().all())

    async def list_company_role_keys(self) -> set[tuple[str, str]]:
        """Return (company_name.lower(), role_title.lower()) for all existing applications."""
        result = await self.session.execute(
            select(JobApplication.company_name, JobApplication.role_title)
        )
        return {(row[0].lower(), (row[1] or "").lower()) for row in result.all()}

    async def list_recent(self, limit: int = 10) -> list[JobApplication]:
        result = await self.session.execute(
            select(JobApplication)
            .options(selectinload(JobApplication.emails))
            .order_by(JobApplication.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update_last_email_at(self, application_id: int, received_at: datetime) -> None:
        """Advance last_email_at only if received_at is more recent."""
        await self.session.execute(
            update(JobApplication)
            .where(JobApplication.id == application_id)
            .where(
                (JobApplication.last_email_at == None)  # noqa: E711
                | (JobApplication.last_email_at < received_at)
            )
            .values(last_email_at=received_at)
        )

    async def set_last_email_at(self, application_id: int, value: datetime | None) -> None:
        """Unconditionally set last_email_at (used after unlinking an email)."""
        await self.session.execute(
            update(JobApplication)
            .where(JobApplication.id == application_id)
            .values(last_email_at=value)
        )