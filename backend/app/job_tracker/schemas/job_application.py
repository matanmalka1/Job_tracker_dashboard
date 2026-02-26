from datetime import datetime
from pydantic import BaseModel, ConfigDict, computed_field
from typing import Optional, List

from app.job_tracker.models.job_application import ApplicationStatus
from app.job_tracker.schemas.email_reference import EmailReferenceRead


class JobApplicationBase(BaseModel):
    company_name: str
    # FIX: role_title is nullable in the ORM model but was marked required
    # here, causing 422 errors when the scan creates apps without a role.
    role_title: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.APPLIED
    source: Optional[str] = None
    applied_at: Optional[datetime] = None
    confidence_score: Optional[float] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None
    next_action_at: Optional[datetime] = None


class JobApplicationCreate(JobApplicationBase):
    pass


class JobApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    source: Optional[str] = None
    applied_at: Optional[datetime] = None
    confidence_score: Optional[float] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None
    next_action_at: Optional[datetime] = None


class JobApplicationRead(JobApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_email_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    emails: List[EmailReferenceRead] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def email_count(self) -> int:
        """Convenience count so the frontend doesn't have to compute len(emails)."""
        return len(self.emails)


class JobApplicationPage(BaseModel):
    total: int
    items: List[JobApplicationRead]