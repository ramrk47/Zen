from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.master_data import Bank, Branch, Client, PropertyType
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/master", tags=["master-data"])


# ---------------------------
# Utilities
# ---------------------------

def _require_admin_user(current_user: User) -> None:
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if str(getattr(current_user, "role", "") or "").upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")


def _norm_name(s: str) -> str:
    # server-side canonical normalization:
    #  - strip
    #  - collapse whitespace
    #  - keep original casing as typed (we only normalize for comparisons)
    return " ".join((s or "").strip().split())


def _norm_email(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    s2 = s.strip().lower()
    return s2 if s2 else None


def _exists_by_name_ilike(q, model_name_col, name: str, extra_filters=None):
    """
    Duplicate detection:
      - compares using ILIKE on normalized input
      - also guards against multiple spaces by normalizing input
    """
    n = _norm_name(name)
    query = q.filter(model_name_col.ilike(n))
    if extra_filters:
        for f in extra_filters:
            query = query.filter(f)
    return query.first()


# ---------------------------
# Schemas
# ---------------------------

class BankIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    # idempotent create: if already exists, return existing instead of 400
    upsert: Optional[bool] = False


class BankOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class BankUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)

    account_name: Optional[str] = Field(default=None, max_length=200)
    account_number: Optional[str] = Field(default=None, max_length=50)
    ifsc: Optional[str] = Field(default=None, max_length=20)

    account_bank_name: Optional[str] = Field(default=None, max_length=200)
    account_branch_name: Optional[str] = Field(default=None, max_length=200)

    upi_id: Optional[str] = Field(default=None, max_length=100)
    invoice_notes: Optional[str] = Field(default=None, max_length=500)


class BankDetailOut(BaseModel):
    id: int
    name: str

    account_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None

    account_bank_name: Optional[str] = None
    account_branch_name: Optional[str] = None

    upi_id: Optional[str] = None
    invoice_notes: Optional[str] = None

    class Config:
        from_attributes = True


class BranchIn(BaseModel):
    bank_id: int
    name: str = Field(..., min_length=2, max_length=200)
    upsert: Optional[bool] = False

    expected_frequency_days: Optional[int] = None
    expected_weekly_revenue: Optional[float] = None

    address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, max_length=100)
    district: Optional[str] = Field(default=None, max_length=100)

    contact_name: Optional[str] = Field(default=None, max_length=200)
    contact_role: Optional[str] = Field(default=None, max_length=100)

    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=250)
    whatsapp: Optional[str] = Field(default=None, max_length=50)

    notes: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = True


class BranchUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)

    expected_frequency_days: Optional[int] = None
    expected_weekly_revenue: Optional[float] = None

    address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, max_length=100)
    district: Optional[str] = Field(default=None, max_length=100)

    contact_name: Optional[str] = Field(default=None, max_length=200)
    contact_role: Optional[str] = Field(default=None, max_length=100)

    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=250)
    whatsapp: Optional[str] = Field(default=None, max_length=50)

    notes: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None


class BranchOut(BaseModel):
    id: int
    bank_id: int
    name: str

    expected_frequency_days: Optional[int] = None
    expected_weekly_revenue: Optional[float] = None

    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None

    contact_name: Optional[str] = None
    contact_role: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None

    notes: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class ClientIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    upsert: Optional[bool] = False
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=250)


class ClientOut(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class PropertyTypeIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    upsert: Optional[bool] = False


class PropertyTypeOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# ---------------------------
# Banks
# ---------------------------

@router.get("/banks", response_model=List[BankOut])
def list_banks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Bank).order_by(Bank.name.asc()).all()


@router.post("/banks", response_model=BankOut)
def create_bank(
    payload: BankIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_user(current_user)

    name = _norm_name(payload.name)

    exists = _exists_by_name_ilike(db.query(Bank), Bank.name, name)
    if exists:
        if payload.upsert:
            return exists
        raise HTTPException(status_code=400, detail="Bank already exists")

    bank = Bank(name=name)
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank


@router.get("/banks/{bank_id}", response_model=BankDetailOut)
def get_bank(
    bank_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
    return bank


@router.patch("/banks/{bank_id}", response_model=BankDetailOut)
def update_bank(
    bank_id: int,
    payload: BankUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_user(current_user)

    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        new_name = _norm_name(data["name"])
        dup = db.query(Bank).filter(Bank.name.ilike(new_name), Bank.id != bank_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Bank name already exists")
        data["name"] = new_name

    for k, v in data.items():
        setattr(bank, k, v)

    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank


# ---------------------------
# Branches
# ---------------------------

@router.get("/branches", response_model=List[BranchOut])
def list_branches(
    bank_id: Optional[int] = None,
    q: Optional[str] = Query(default=None, description="Optional search (case-insensitive substring)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Branch)
    if bank_id is not None:
        query = query.filter(Branch.bank_id == bank_id)
    if q:
        query = query.filter(Branch.name.ilike(f"%{_norm_name(q)}%"))
    return query.order_by(Branch.name.asc()).all()


@router.get("/branches/{branch_id}", response_model=BranchOut)
def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    br = db.query(Branch).filter(Branch.id == branch_id).first()
    if not br:
        raise HTTPException(status_code=404, detail="Branch not found")
    return br


@router.post("/branches", response_model=BranchOut)
def create_branch(
    payload: BranchIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_user(current_user)

    bank = db.query(Bank).filter(Bank.id == payload.bank_id).first()
    if not bank:
        raise HTTPException(status_code=400, detail="Invalid bank_id")

    name = _norm_name(payload.name)

    dup = _exists_by_name_ilike(
        db.query(Branch),
        Branch.name,
        name,
        extra_filters=[Branch.bank_id == payload.bank_id],
    )
    if dup:
        if payload.upsert:
            return dup
        raise HTTPException(status_code=400, detail="Branch already exists for this bank")

    branch = Branch(
        bank_id=payload.bank_id,
        name=name,
        expected_frequency_days=payload.expected_frequency_days,
        expected_weekly_revenue=payload.expected_weekly_revenue,
        address=payload.address,
        city=payload.city,
        district=payload.district,
        contact_name=payload.contact_name,
        contact_role=payload.contact_role,
        phone=(payload.phone.strip() if payload.phone else None),
        email=_norm_email(payload.email),
        whatsapp=payload.whatsapp,
        notes=payload.notes,
        is_active=(payload.is_active if payload.is_active is not None else True),
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.patch("/branches/{branch_id}", response_model=BranchOut)
def update_branch(
    branch_id: int,
    payload: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_user(current_user)

    br = db.query(Branch).filter(Branch.id == branch_id).first()
    if not br:
        raise HTTPException(status_code=404, detail="Branch not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        new_name = _norm_name(data["name"])
        dup = (
            db.query(Branch)
            .filter(
                Branch.bank_id == br.bank_id,
                Branch.name.ilike(new_name),
                Branch.id != branch_id,
            )
            .first()
        )
        if dup:
            raise HTTPException(status_code=400, detail="Branch name already exists for this bank")
        data["name"] = new_name

    if "email" in data and data["email"] is not None:
        data["email"] = _norm_email(data["email"])

    for k, v in data.items():
        setattr(br, k, v)

    db.add(br)
    db.commit()
    db.refresh(br)
    return br


# ---------------------------
# Clients
# ---------------------------

@router.get("/clients", response_model=List[ClientOut])
def list_clients(
    q: Optional[str] = Query(default=None, description="Optional search (case-insensitive substring)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Client)
    if q:
        query = query.filter(Client.name.ilike(f"%{_norm_name(q)}%"))
    return query.order_by(Client.name.asc()).all()


@router.post("/clients", response_model=ClientOut)
def create_client(
    payload: ClientIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_user(current_user)

    name = _norm_name(payload.name)
    dup = _exists_by_name_ilike(db.query(Client), Client.name, name)
    if dup:
        if payload.upsert:
            return dup
        raise HTTPException(status_code=400, detail="Client already exists")

    client = Client(
        name=name,
        phone=(payload.phone.strip() if payload.phone else None),
        email=_norm_email(payload.email),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


# ---------------------------
# Property Types
# ---------------------------

@router.get("/property-types", response_model=List[PropertyTypeOut])
def list_property_types(
    q: Optional[str] = Query(default=None, description="Optional search (case-insensitive substring)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(PropertyType)
    if q:
        query = query.filter(PropertyType.name.ilike(f"%{_norm_name(q)}%"))
    return query.order_by(PropertyType.name.asc()).all()


@router.post("/property-types", response_model=PropertyTypeOut)
def create_property_type(
    payload: PropertyTypeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_user(current_user)

    name = _norm_name(payload.name)
    dup = _exists_by_name_ilike(db.query(PropertyType), PropertyType.name, name)
    if dup:
        if payload.upsert:
            return dup
        raise HTTPException(status_code=400, detail="Property type already exists")

    pt = PropertyType(name=name)
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return pt