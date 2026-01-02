from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)

    # Public-facing code, e.g. "VAL/2025/0012"
    assignment_code = Column(String(64), unique=True, index=True, nullable=False)

    # BANK / EXTERNAL_VALUER / DIRECT_CLIENT
    case_type = Column(String(32), nullable=False, default="BANK")

    # -------------------------
    # Master-data IDs
    # -------------------------
    bank_id = Column(
        Integer,
        ForeignKey("banks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    branch_id = Column(
        Integer,
        ForeignKey("branches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    client_id = Column(
        Integer,
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    property_type_id = Column(
        Integer,
        ForeignKey("property_types.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # -------------------------
    # Legacy string fields (BACKWARD COMPATIBLE)
    # -------------------------
    bank_name = Column(String(128), nullable=True)
    branch_name = Column(String(128), nullable=True)
    valuer_client_name = Column(String(128), nullable=True)
    property_type = Column(String(64), nullable=True)

    borrower_name = Column(String(128), nullable=True)
    phone = Column(String(32), nullable=True)
    address = Column(Text, nullable=True)

    land_area = Column(Float, nullable=True)
    builtup_area = Column(Float, nullable=True)

    status = Column(String(32), nullable=False, default="SITE_VISIT")

    # TEMP: string-based assignment (no FK yet)
    assigned_to = Column(String(128), nullable=True)

    site_visit_date = Column(Date, nullable=True)
    report_due_date = Column(Date, nullable=True)

    fees = Column(Integer, nullable=True)
    is_paid = Column(Boolean, nullable=False, default=False)

    notes = Column(Text, nullable=True)

    # -------------------------
    # Relationships
    # -------------------------
    files = relationship(
        "File",
        back_populates="assignment",
        cascade="all, delete-orphan",
    )

    activities = relationship(
        "Activity",
        back_populates="assignment",
        cascade="all, delete-orphan",
    )

    bank = relationship("Bank", foreign_keys=[bank_id])
    branch = relationship("Branch", foreign_keys=[branch_id])
    client = relationship("Client", foreign_keys=[client_id])
    property_type_ref = relationship("PropertyType", foreign_keys=[property_type_id])

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)