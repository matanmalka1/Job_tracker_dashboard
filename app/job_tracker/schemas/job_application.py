from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

from app.job_tracker.models.job_application import ApplicationStatus
from app.job_tracker.schemas.email_reference import EmailReferenceRead


class JobApplicationBase(BaseModel):
    company_name: str
    role_title: str
    status: ApplicationStatus = ApplicationStatus.NEW
    source: Optional[str] = None
    applied_at: Optional[datetime] = None
    confidence_score: Optional[float] = None


class JobApplicationCreate(JobApplicationBase):
    pass


class JobApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    source: Optional[str] = None
    applied_at: Optional[datetime] = None
    confidence_score: Optional[float] = None


class JobApplicationRead(JobApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_email_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    emails: List[EmailReferenceRead] = []


class JobApplicationPage(BaseModel):
    total: int
    items: List[JobApplicationRead]
