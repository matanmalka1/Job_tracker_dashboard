from typing import Optional

from app.job_tracker.models.job_application import ApplicationStatus, JobApplication
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
        remaining_max = await self.email_repo.get_latest_received_at(application_id)
        await self.app_repo.set_last_email_at(application_id, remaining_max)
        await self._session.commit()
        return True

    async def get_stats(self) -> dict:
        """Return dashboard KPIs assembled from repository counts."""
        status_rows = await self.app_repo.count_by_status()
        by_status: dict[str, int] = {s.value: 0 for s in ApplicationStatus}
        total = 0
        for status, count in status_rows:
            key = status.value if isinstance(status, ApplicationStatus) else str(status)
            if key in by_status:
                by_status[key] = count
                total += count

        responded_statuses = [
            ApplicationStatus.INTERVIEWING,
            ApplicationStatus.OFFER,
            ApplicationStatus.HIRED,
            ApplicationStatus.REJECTED,
        ]
        apps_with_response = await self.app_repo.count_by_statuses(responded_statuses)
        reply_rate = (apps_with_response / total * 100) if total > 0 else 0.0

        return {"total": total, "by_status": by_status, "reply_rate": round(reply_rate, 1)}

    async def get_pipeline(self) -> dict:
        """Return all applications grouped by status for the Kanban board."""
        apps = await self.app_repo.list_pipeline()
        total = len(apps)

        by_status: dict[ApplicationStatus, list[JobApplication]] = {s: [] for s in ApplicationStatus}
        for app in apps:
            by_status[app.status].append(app)

        columns = [
            {
                "status": status,
                "total": len(group),
                "items": [
                    {
                        "id": app.id,
                        "company_name": app.company_name,
                        "role_title": app.role_title,
                        "status": app.status,
                        "source": app.source,
                        "confidence_score": app.confidence_score,
                        "applied_at": app.applied_at,
                        "last_email_at": app.last_email_at,
                        "updated_at": app.updated_at,
                        "email_count": len(app.emails),
                    }
                    for app in group
                ],
            }
            for status, group in by_status.items()
        ]

        return {"columns": columns, "total": total}

    async def get_companies_summary(
        self,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """Return paginated companies summary assembled from aggregate rows."""
        company_rows, status_rows, total = await self.app_repo.list_company_summary_page(
            search=search, limit=limit, offset=offset
        )
        status_counts_by_company = {
            row["company_name"]: {s.value: 0 for s in ApplicationStatus}
            for row in company_rows
        }
        for row in status_rows:
            status = row["status"]
            status_key = status.value if isinstance(status, ApplicationStatus) else str(status)
            status_counts_by_company[row["company_name"]][status_key] = row["count"]

        items = [
            {
                "company_name": row["company_name"],
                "application_count": row["application_count"],
                "latest_activity": row["latest_activity"],
                "status_counts": status_counts_by_company[row["company_name"]],
            }
            for row in company_rows
        ]
        return {"total": total, "items": items}
