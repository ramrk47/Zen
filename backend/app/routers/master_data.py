from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.models.master_data import Bank, Branch, Client, PropertyType
from app.utils.security import verify_password

# ✅ IMPORTANT: this must be named `router` because app.main imports it as `router`
router = APIRouter(prefix="/api/master", tags=["master-data"])


# ---------------------------
# Admin guard (header-based)
# ---------------------------

def _get_user_password_hash(user: User) -> str:
    for attr in ("password_hash", "hashed_password", "password"):
        if hasattr(user, attr):
            val = getattr(user, attr)
            if isinstance(val, str) and val.strip():
                return val
    raise HTTPException(
        status_code=500,
        detail="User model missing password hash field (password_hash / hashed_password / password).",
    )


def _require_admin(db: Session, email: str | None, password: str | None) -> None:
    if not email or not password:
        raise HTTPException(status_code=401, detail="Missing admin credentials")

    admin = db.query(User).filter(User.email == email.strip().lower()).first()
    if not admin or str(getattr(admin, "role", "")).upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    if not verify_password(password, _get_user_password_hash(admin)):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")


# ---------------------------
# Schemas (kept inside same file)
# ---------------------------

class BankIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)


class BankOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class BranchIn(BaseModel):
    bank_id: int
    name: str = Field(..., min_length=2, max_length=200)
    expected_frequency_days: Optional[int] = None
    expected_weekly_revenue: Optional[float] = None


class BranchOut(BaseModel):
    id: int
    bank_id: int
    name: str
    expected_frequency_days: Optional[int] = None
    expected_weekly_revenue: Optional[float] = None

    class Config:
        from_attributes = True


class ClientIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
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


class PropertyTypeOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# ---------------------------
# Banks
# ---------------------------

@router.get("/banks", response_model=List[BankOut])
def list_banks(db: Session = Depends(get_db)):
    return db.query(Bank).order_by(Bank.name.asc()).all()


@router.post("/banks", response_model=BankOut)
def create_bank(
    payload: BankIn,
    db: Session = Depends(get_db),
    x_admin_email: str | None = Header(default=None, alias="X-Admin-Email"),
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
):
    _require_admin(db, x_admin_email, x_admin_password)

    name = payload.name.strip()
    exists = db.query(Bank).filter(Bank.name.ilike(name)).first()
    if exists:
        raise HTTPException(status_code=400, detail="Bank already exists")

    bank = Bank(name=name)
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank


# ---------------------------
# Branches (dependent filter: ?bank_id=)
# ---------------------------

@router.get("/branches", response_model=List[BranchOut])
def list_branches(bank_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Branch)
    if bank_id is not None:
        q = q.filter(Branch.bank_id == bank_id)
    return q.order_by(Branch.name.asc()).all()


@router.post("/branches", response_model=BranchOut)
def create_branch(
    payload: BranchIn,
    db: Session = Depends(get_db),
    x_admin_email: str | None = Header(default=None, alias="X-Admin-Email"),
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
):
    _require_admin(db, x_admin_email, x_admin_password)

    bank = db.query(Bank).filter(Bank.id == payload.bank_id).first()
    if not bank:
        raise HTTPException(status_code=400, detail="Invalid bank_id")

    name = payload.name.strip()
    dup = (
        db.query(Branch)
        .filter(Branch.bank_id == payload.bank_id, Branch.name.ilike(name))
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="Branch already exists for this bank")

    branch = Branch(
        bank_id=payload.bank_id,
        name=name,
        expected_frequency_days=payload.expected_frequency_days,
        expected_weekly_revenue=payload.expected_weekly_revenue,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


# ---------------------------
# Clients
# ---------------------------

@router.get("/clients", response_model=List[ClientOut])
def list_clients(db: Session = Depends(get_db)):
    return db.query(Client).order_by(Client.name.asc()).all()


@router.post("/clients", response_model=ClientOut)
def create_client(
    payload: ClientIn,
    db: Session = Depends(get_db),
    x_admin_email: str | None = Header(default=None, alias="X-Admin-Email"),
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
):
    _require_admin(db, x_admin_email, x_admin_password)

    name = payload.name.strip()
    dup = db.query(Client).filter(Client.name.ilike(name)).first()
    if dup:
        raise HTTPException(status_code=400, detail="Client already exists")

    client = Client(
        name=name,
        phone=(payload.phone.strip() if payload.phone else None),
        email=(payload.email.strip().lower() if payload.email else None),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


# ---------------------------
# Property Types
# ---------------------------

@router.get("/property-types", response_model=List[PropertyTypeOut])
def list_property_types(db: Session = Depends(get_db)):
    return db.query(PropertyType).order_by(PropertyType.name.asc()).all()


@router.post("/property-types", response_model=PropertyTypeOut)
def create_property_type(
    payload: PropertyTypeIn,
    db: Session = Depends(get_db),
    x_admin_email: str | None = Header(default=None, alias="X-Admin-Email"),
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
):
    _require_admin(db, x_admin_email, x_admin_password)

    name = payload.name.strip()
    dup = db.query(PropertyType).filter(PropertyType.name.ilike(name)).first()
    if dup:
        raise HTTPException(status_code=400, detail="Property type already exists")

    pt = PropertyType(name=name)
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return pt