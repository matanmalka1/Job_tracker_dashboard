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
                JobApplication.source.ilike(pattern),
                JobApplication.job_url.ilike(pattern),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        _sort_map = {
            "updated_at": JobApplication.updated_at.desc(),
            "created_at": JobApplication.created_at.desc(),
            "applied_at": JobApplication.applied_at.desc().nulls_last(),
            "last_email_at": JobApplication.last_email_at.desc().nulls_last(),
            "company_name": JobApplication.company_name.asc(),
            "role_title": JobApplication.role_title.asc().nulls_last(),
            "status": JobApplication.status.asc(),
        }
        sort_col = _sort_map.get(sort or "", JobApplication.last_email_at.desc().nulls_last())

        total = await self.session.scalar(count_query)
        result = await self.session.execute(
            query.order_by(sort_col).limit(limit).offset(offset)
        )
        return list(result.scalars().all()), total or 0

    async def count_by_status(self) -> list[tuple[ApplicationStatus, int]]:
        """Return application counts grouped by status."""
        status_result = await self.session.execute(
            select(JobApplication.status, func.count().label("cnt"))
            .group_by(JobApplication.status)
        )
        return [(row[0], row[1]) for row in status_result.all()]

    async def count_by_statuses(self, statuses: list[ApplicationStatus]) -> int:
        return await self.session.scalar(
            select(func.count())
            .select_from(JobApplication)
            .where(JobApplication.status.in_(statuses))
        ) or 0

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

    async def list_pipeline(self) -> list[JobApplication]:
        """Return all applications with minimal fields, ordered by last_email_at desc.
        Groups are assembled by the service/route layer."""
        result = await self.session.execute(
            select(JobApplication)
            .options(selectinload(JobApplication.emails))
            .order_by(JobApplication.last_email_at.desc().nulls_last(), JobApplication.id.desc())
        )
        return list(result.scalars().all())

    async def list_company_summary_page(
        self,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict], list[dict], int]:
        """Return company aggregate rows and per-status count rows for one page."""
        base_q = select(JobApplication.company_name)
        if search:
            base_q = base_q.where(JobApplication.company_name.ilike(f"%{search}%"))

        count_q = select(func.count()).select_from(
            base_q.distinct().subquery()
        )
        total = await self.session.scalar(count_q) or 0

        page_q = (
            select(
                JobApplication.company_name.label("company_name"),
                func.count(JobApplication.id).label("application_count"),
                func.max(JobApplication.updated_at).label("latest_activity"),
            )
            .group_by(JobApplication.company_name)
        )
        if search:
            page_q = page_q.where(JobApplication.company_name.ilike(f"%{search}%"))
        page_q = page_q.order_by(func.max(JobApplication.updated_at).desc()).limit(limit).offset(offset)

        company_result = await self.session.execute(page_q)
        company_rows = [dict(row._mapping) for row in company_result.all()]
        company_names = [row["company_name"] for row in company_rows]
        if not company_names:
            return [], [], total

        status_q = (
            select(
                JobApplication.company_name.label("company_name"),
                JobApplication.status.label("status"),
                func.count(JobApplication.id).label("count"),
            )
            .where(JobApplication.company_name.in_(company_names))
            .group_by(JobApplication.company_name, JobApplication.status)
        )
        status_result = await self.session.execute(status_q)
        status_rows = [dict(row._mapping) for row in status_result.all()]
        return company_rows, status_rows, total
