from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class EmailReferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    gmail_message_id: str
    subject: Optional[str] = None
    sender: Optional[str] = None
    received_at: datetime
    snippet: Optional[str] = None
    application_id: Optional[int] = None


class EmailReferencePage(BaseModel):
    total: int
    items: List[EmailReferenceRead]
