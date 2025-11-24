from datetime import datetime, date
from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)

    # Public-facing code, e.g. "VAL/2025/0012"
    assignment_code = Column(String(64), unique=True, index=True, nullable=False)

    # How this case came in
    # "BANK" / "EXTERNAL_VALUER" / "DIRECT_CLIENT"
    case_type = Column(String(32), nullable=False, default="BANK")

    # Bank-side info (nullable for external valuers / direct clients)
    bank_name = Column(String(128), nullable=True)
    branch_name = Column(String(128), nullable=True)

    # For external valuers who send work to you
    valuer_client_name = Column(String(128), nullable=True)

    borrower_name = Column(String(128), nullable=True)
    phone = Column(String(32), nullable=True)

    address = Column(Text, nullable=True)
    property_type = Column(String(64), nullable=True)

    land_area = Column(Float, nullable=True)      # in sqft or as you decide
    builtup_area = Column(Float, nullable=True)   # in sqft

    # Workflow status: SITE_VISIT / IN_PROGRESS / FINAL_CHECK / COMPLETED / PAID
    status = Column(String(32), nullable=False, default="SITE_VISIT")

    assigned_to = Column(String(128), nullable=True)  # later can become FK to users

    site_visit_date = Column(Date, nullable=True)
    report_due_date = Column(Date, nullable=True)

    fees = Column(Integer, nullable=True)  # keep simple (₹) for now
    is_paid = Column(Boolean, nullable=False, default=False)

    notes = Column(Text, nullable=True)

    files = relationship("File", back_populates="assignment", cascade="all, delete-orphan")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )