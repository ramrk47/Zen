# backend/app/models/file.py
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship

from app.db import Base


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)

    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False, index=True)

    # Original filename the user uploaded (what they see)
    filename = Column(String, nullable=False)

    # Stored path on disk (server truth)
    filepath = Column(String, nullable=False)

    # Optional metadata (safe to be NULL for old records)
    stored_name = Column(String, nullable=True)
    content_type = Column(String, nullable=True)
    size_bytes = Column(BigInteger, nullable=True)

    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assignment = relationship("Assignment", back_populates="files")