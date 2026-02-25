from datetime import datetime
from enum import Enum
from sqlalchemy import Column, DateTime, Enum as SAEnum, Float, Integer, String
from sqlalchemy.orm import relationship

from app.db import Base


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
    status = Column(SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.NEW)
    source = Column(String(255), nullable=True)
    applied_at = Column(DateTime, nullable=True)
    last_email_at = Column(DateTime, nullable=True)
    confidence_score = Column(Float, nullable=True)

    emails = relationship("EmailReference", back_populates="application", cascade="all, delete-orphan")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
