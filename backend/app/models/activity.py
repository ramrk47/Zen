# backend/app/models/activity.py
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db import Base


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)

    # IMPORTANT:
    # Use SET NULL (not CASCADE), so audit trail survives even if assignment is deleted.
    assignment_id = Column(
        Integer,
        ForeignKey("assignments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    actor_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Examples:
    # ASSIGNMENT_CREATED
    # STATUS_CHANGED
    # FILE_UPLOADED
    # ASSIGNMENT_UPDATED
    type = Column(String(64), nullable=False)

    # Flexible event data for Postgres
    payload = Column(JSONB, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assignment = relationship("Assignment", back_populates="activities")
    actor = relationship("User")