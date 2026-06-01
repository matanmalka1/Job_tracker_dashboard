from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db import Base, utcnow


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=False, default="running")  # running | completed | failed
    emails_fetched = Column(Integer, nullable=True)
    emails_inserted = Column(Integer, nullable=True)
    apps_created = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<ScanRun id={self.id} status={self.status!r}>"
