from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db import Base


class EmailReference(Base):
    __tablename__ = "email_references"
    __table_args__ = (UniqueConstraint("gmail_message_id", name="uq_email_reference_message_id"),)

    id = Column(Integer, primary_key=True, index=True)
    gmail_message_id = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=True)
    sender = Column(String(255), nullable=True)
    received_at = Column(DateTime, nullable=False)
    snippet = Column(Text, nullable=True)
    application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=True)

    application = relationship("JobApplication", back_populates="emails")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
