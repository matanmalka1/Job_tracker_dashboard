from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.job_tracker.models.job_application import ApplicationStatus


class PipelineCardRead(BaseModel):
    """Minimal application card for Kanban columns, omitting heavy text fields."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    role_title: Optional[str] = None
    status: ApplicationStatus
    source: Optional[str] = None
    confidence_score: Optional[float] = None
    applied_at: Optional[datetime] = None
    last_email_at: Optional[datetime] = None
    updated_at: datetime
    email_count: int = 0


class PipelineColumnRead(BaseModel):
    status: ApplicationStatus
    total: int
    items: list[PipelineCardRead]


class PipelineRead(BaseModel):
    columns: list[PipelineColumnRead]
    total: int

