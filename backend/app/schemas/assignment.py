# backend/app/schemas/assignment.py
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class AssignmentBase(BaseModel):
    case_type: str = Field(..., example="BANK")  # BANK / EXTERNAL_VALUER / DIRECT_CLIENT

    # NEW: master-data IDs (preferred)
    bank_id: Optional[int] = None
    branch_id: Optional[int] = None
    client_id: Optional[int] = None
    property_type_id: Optional[int] = None

    # Legacy string fields (still returned + still accepted for backward compatibility)
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    valuer_client_name: Optional[str] = None
    property_type: Optional[str] = None

    borrower_name: Optional[str] = None
    phone: Optional[str] = None

    address: Optional[str] = None

    land_area: Optional[float] = None
    builtup_area: Optional[float] = None

    status: str = Field(default="SITE_VISIT")
    assigned_to: Optional[str] = None

    site_visit_date: Optional[date] = None
    report_due_date: Optional[date] = None

    fees: Optional[int] = None
    is_paid: bool = False

    notes: Optional[str] = None


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    # all optional for PATCH-like update
    case_type: Optional[str] = None

    bank_id: Optional[int] = None
    branch_id: Optional[int] = None
    client_id: Optional[int] = None
    property_type_id: Optional[int] = None

    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    valuer_client_name: Optional[str] = None
    property_type: Optional[str] = None

    borrower_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    land_area: Optional[float] = None
    builtup_area: Optional[float] = None

    status: Optional[str] = None
    assigned_to: Optional[str] = None
    site_visit_date: Optional[date] = None
    report_due_date: Optional[date] = None

    fees: Optional[int] = None
    is_paid: Optional[bool] = None

    notes: Optional[str] = None


class AssignmentRead(AssignmentBase):
    id: int
    assignment_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True