from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.db import Base


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship("Assignment", back_populates="files")