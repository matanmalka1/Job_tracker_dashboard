from typing import Optional

from sqlalchemy import select, func, update

from app.job_tracker.models.job_application import ApplicationStatus, JobApplication
from app.job_tracker.models.email_reference import EmailReference
from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository


class JobApplicationService:
    def __init__(
        self,
        app_repo: JobApplicationRepository,
        email_repo: EmailReferenceRepository,
    ):
        self.app_repo = app_repo
        self.email_repo = email_repo

    @property
    def _session(self):
        return self.app_repo.session


    async def create(self, data: dict) -> JobApplication:
        app = await self.app_repo.create(data)
        await self._session.commit()
        return await self.app_repo.get_by_id(app.id)

    async def get_by_id(self, application_id: int) -> Optional[JobApplication]:
        return await self.app_repo.get_by_id(application_id)

    async def update(self, application_id: int, data: dict) -> Optional[JobApplication]:
        app = await self.app_repo.update(application_id, data)
        if app:
            await self._session.commit()
        return app

    async def delete(self, application_id: int) -> bool:
        deleted = await self.app_repo.delete(application_id)
        if deleted:
            await self._session.commit()
        return deleted

    async def bulk_delete(self, ids: list[int]) -> tuple[int, list[int]]:
        deleted_count, not_found = await self.app_repo.bulk_delete(ids)
        if deleted_count:
            await self._session.commit()
        return deleted_count, not_found

    async def list_paginated(
        self,
        limit: int,
        offset: int,
        status: Optional[ApplicationStatus] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> tuple[list[JobApplication], int]:
        return await self.app_repo.list_paginated(
            limit=limit, offset=offset, status=status, search=search, sort=sort
        )

    async def assign_email(self, application_id: int, email_id: int) -> bool:
        """Link an existing EmailReference to a JobApplication."""
        email = await self.email_repo.get_by_id(email_id)
        if not email:
            return False

        app = await self.app_repo.get_by_id(application_id)
        if not app:
            return False

        email.application_id = application_id
        await self.app_repo.update_last_email_at(application_id, email.received_at)
        await self._session.commit()
        return True

    async def unassign_email(self, application_id: int, email_id: int) -> bool:
        """Unlink an EmailReference from a JobApplication."""
        email = await self.email_repo.get_linked(email_id, application_id)
        if not email:
            return False

        email.application_id = None

        remaining_max = await self._session.scalar(
            select(func.max(EmailReference.received_at)).where(
                EmailReference.application_id == application_id
            )
        )
        await self._session.execute(
            update(JobApplication)
            .where(JobApplication.id == application_id)
            .values(last_email_at=remaining_max)
        )
        await self._session.commit()
        return True
