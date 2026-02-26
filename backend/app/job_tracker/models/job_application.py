from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, DateTime, Enum as SAEnum, Float, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db import Base


def _utcnow():
    return datetime.now(timezone.utc)


class ApplicationStatus(str, Enum):
    NEW = "new"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"
    HIRED = "hired"


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    role_title = Column(String(255), nullable=False)
    status = Column(SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.APPLIED)
    source = Column(String(255), nullable=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    last_email_at = Column(DateTime(timezone=True), nullable=True)
    confidence_score = Column(Float, nullable=True)

    notes = Column(Text, nullable=True)
    job_url = Column(String(2000), nullable=True)
    next_action_at = Column(DateTime(timezone=True), nullable=True)

    emails = relationship("EmailReference", back_populates="application", cascade="all, delete-orphan")

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)