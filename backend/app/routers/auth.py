from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.user import CreateUserRequest, LoginRequest
from app.utils.security import verify_password, hash_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------
# Compatibility helpers
# ---------------------------

def _get_user_role(user: User) -> str:
    role = getattr(user, "role", None)
    return str(role) if role is not None else ""


def _get_user_password_hash(user: User) -> str:
    """
    Your repo may store the hashed password under different names.
    We support common patterns so auth doesn't crash.
    """
    for attr in ("password_hash", "hashed_password", "password"):
        if hasattr(user, attr):
            val = getattr(user, attr)
            if isinstance(val, str) and val.strip():
                return val
    raise HTTPException(
        status_code=500,
        detail="User model has no password hash field (expected password_hash / hashed_password / password).",
    )


def _set_user_password_hash(user: User, hashed: str) -> None:
    """
    Set hashed password in the field your model actually has.
    Preference order:
      password_hash -> hashed_password -> password
    """
    for attr in ("password_hash", "hashed_password", "password"):
        if hasattr(user, attr):
            setattr(user, attr, hashed)
            return

    # If none exist, fail loudly
    raise HTTPException(
        status_code=500,
        detail="User model has no writable password field (expected password_hash / hashed_password / password).",
    )


def _is_admin(user: User) -> bool:
    return _get_user_role(user).upper() == "ADMIN"


def _get_admin_from_headers(
    db: Session,
    admin_email: str | None,
    admin_password: str | None,
) -> User:
    if not admin_email or not admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing admin credentials",
        )

    email = admin_email.strip().lower()
    admin = db.query(User).filter(User.email == email).first()

    if not admin or not _is_admin(admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    admin_hash = _get_user_password_hash(admin)
    if not verify_password(admin_password, admin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    return admin


# ---------------------------
# Routes
# ---------------------------

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Returns user profile on success.
    Token/JWT can be added later.
    """
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_hash = _get_user_password_hash(user)
    if not verify_password(payload.password, user_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "id": user.id,
        "email": user.email,
        "full_name": getattr(user, "full_name", None),
        "role": _get_user_role(user),
    }


@router.post("/users")
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    x_admin_email: str | None = Header(default=None, alias="X-Admin-Email"),
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
):
    """
    Admin-protected user creation via headers.
    """
    _get_admin_from_headers(db, x_admin_email, x_admin_password)

    email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    role = (payload.role or "EMPLOYEE").upper()

    user = User(
        email=email,
        full_name=payload.full_name,
        role=role,
    )
    _set_user_password_hash(user, hash_password(payload.password))

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": getattr(user, "full_name", None),
        "role": _get_user_role(user),
        "is_active": getattr(user, "is_active", True),
    }