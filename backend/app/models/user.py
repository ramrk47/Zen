# app/models/user.py
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # login identity
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)

    # auth
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    # role-based visibility: "ADMIN" vs "EMPLOYEE"
    role = Column(String(20), nullable=False, default="EMPLOYEE")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # later we can add:
    # assignments = relationship("Assignment", back_populates="assignee")