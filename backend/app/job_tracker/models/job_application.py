from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SAEnum, Float, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db import Base, utcnow


class ApplicationStatus(str, Enum):
    NEW = "new"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"
    HIRED = "hired"


class JobApplication(Base):
    __tablename__ = "job_applications"
    __table_args__ = (
        Index("ix_job_applications_status", "status"),
        Index("ix_job_applications_company_name", "company_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    role_title = Column(String(255), nullable=True)
    status = Column(SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.APPLIED)
    source = Column(String(255), nullable=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    last_email_at = Column(DateTime(timezone=True), nullable=True)
    confidence_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    job_url = Column(String(2000), nullable=True)
    next_action_at = Column(DateTime(timezone=True), nullable=True)

    emails = relationship("EmailReference", back_populates="application", cascade="all, delete-orphan")

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<JobApplication id={self.id} company={self.company_name!r} status={self.status}>"
