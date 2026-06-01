from datetime import datetime

from pydantic import BaseModel


class CompanySummaryRead(BaseModel):
    company_name: str
    application_count: int
    latest_activity: datetime
    status_counts: dict[str, int]


class CompanySummaryPage(BaseModel):
    total: int
    items: list[CompanySummaryRead]

