from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.job_tracker.models.job_application import ApplicationStatus
from app.job_tracker.schemas.email_reference import EmailReferenceRead


def _validate_company_name(v: str) -> str:
    if not v.strip():
        raise ValueError("company_name cannot be blank")
    return v.strip()


def _validate_job_url(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    v = v.strip()
    if v and not (v.startswith("http://") or v.startswith("https://")):
        raise ValueError("job_url must start with http:// or https://")
    return v or None


class JobApplicationCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    role_title: Optional[str] = Field(None, max_length=255)
    status: ApplicationStatus = ApplicationStatus.APPLIED
    source: Optional[str] = Field(None, max_length=255)
    applied_at: Optional[datetime] = None
    confidence_score: Optional[float] = None
    notes: Optional[str] = None
    job_url: Optional[str] = Field(None, max_length=2000)
    next_action_at: Optional[datetime] = None

    @field_validator("company_name")
    @classmethod
    def company_name_not_blank(cls, v: str) -> str:
        return _validate_company_name(v)

    @field_validator("job_url")
    @classmethod
    def validate_job_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_job_url(v)


class JobApplicationUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    role_title: Optional[str] = Field(None, max_length=255)
    status: Optional[ApplicationStatus] = None
    source: Optional[str] = Field(None, max_length=255)
    applied_at: Optional[datetime] = None
    confidence_score: Optional[float] = None
    notes: Optional[str] = None
    job_url: Optional[str] = Field(None, max_length=2000)
    next_action_at: Optional[datetime] = None

    @field_validator("company_name")
    @classmethod
    def company_name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validate_company_name(v)

    @field_validator("job_url")
    @classmethod
    def validate_job_url(cls, v: Optional[str]) -> Optional[str]:
        return _validate_job_url(v)


class JobApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    role_title: Optional[str] = None
    status: ApplicationStatus
    source: Optional[str] = None
    applied_at: Optional[datetime] = None
    confidence_score: Optional[float] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None
    next_action_at: Optional[datetime] = None
    last_email_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    emails: list[EmailReferenceRead] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def email_count(self) -> int:
        return len(self.emails)


class JobApplicationPage(BaseModel):
    total: int
    items: list[JobApplicationRead]
