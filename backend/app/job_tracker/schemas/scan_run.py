from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ScanRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    emails_fetched: Optional[int] = None
    emails_inserted: Optional[int] = None
    apps_created: Optional[int] = None
    error: Optional[str] = None
