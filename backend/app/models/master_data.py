from __future__ import annotations

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Boolean,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


# =========================
# BANK
# =========================

class Bank(Base):
    __tablename__ = "banks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True, index=True)

    # --- Bank Account / Invoice Defaults ---
    account_name = Column(String(200), nullable=True)
    account_number = Column(String(50), nullable=True)
    ifsc = Column(String(20), nullable=True)

    account_bank_name = Column(String(200), nullable=True)
    account_branch_name = Column(String(200), nullable=True)

    upi_id = Column(String(100), nullable=True)
    invoice_notes = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    branches = relationship(
        "Branch",
        back_populates="bank",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# =========================
# BRANCH
# =========================

class Branch(Base):
    __tablename__ = "branches"
    __table_args__ = (
        UniqueConstraint("bank_id", "name", name="uq_branch_bank_name"),
    )

    id = Column(Integer, primary_key=True, index=True)

    bank_id = Column(
        Integer,
        ForeignKey("banks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(200), nullable=False, index=True)

    # --- Ops / Analytics ---
    expected_frequency_days = Column(Integer, nullable=True)
    expected_weekly_revenue = Column(Float, nullable=True)

    # --- Branch Address ---
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)

    # --- Contact Person (mutable – officers change often) ---
    contact_name = Column(String(200), nullable=True)
    contact_role = Column(String(100), nullable=True)

    phone = Column(String(50), nullable=True)
    email = Column(String(250), nullable=True)
    whatsapp = Column(String(50), nullable=True)

    notes = Column(String(500), nullable=True)

    is_active = Column(Boolean, nullable=False, server_default="true")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    bank = relationship("Bank", back_populates="branches")


# =========================
# CLIENT
# =========================

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True, index=True)

    phone = Column(String(50), nullable=True)
    email = Column(String(250), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# =========================
# PROPERTY TYPE
# =========================

class PropertyType(Base):
    __tablename__ = "property_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True, index=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )