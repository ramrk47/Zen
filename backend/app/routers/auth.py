from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.user import CreateUserRequest, LoginRequest
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------
# Compatibility helpers
# ---------------------------

def _get_user_role(user: User) -> str:
    role = getattr(user, "role", None)
    return str(role) if role is not None else ""


def _get_user_password_hash(user: User) -> str:
    """Return the stored password hash.

    Your repo historically used different attribute names.
    This keeps auth stable even if an older DB/model exists.

    Preferred: hashed_password (current model)
    Back-compat: password_hash
    """
    for attr in ("hashed_password", "password_hash"):
        if hasattr(user, attr):
            val = getattr(user, attr)
            if isinstance(val, str) and val.strip():
                return val

    raise HTTPException(
        status_code=500,
        detail="User model has no password hash field (expected hashed_password or password_hash).",
    )


def _set_user_password_hash(user: User, hashed: str) -> None:
    """Set password hash using the field your model actually has."""
    if hasattr(user, "hashed_password"):
        setattr(user, "hashed_password", hashed)
        return
    if hasattr(user, "password_hash"):
        setattr(user, "password_hash", hashed)
        return

    raise HTTPException(
        status_code=500,
        detail="User model has no writable password field (expected hashed_password or password_hash).",
    )


def _is_admin(user: User) -> bool:
    return _get_user_role(user).upper() == "ADMIN"


# ---------------------------
# Minimal identity dependencies (internal-app safe mode)
# ---------------------------
#
# Zen Ops is an internal ops app right now. We are not doing JWT yet.
# To still enforce ADMIN-only operations safely, we do this:
#   - Frontend sends `X-User-Email: <email>`
#   - Backend looks up the user in DB and uses DB role as truth
#
# This prevents a user from spoofing role in the client.
# (Yes, email header can be spoofed too — full security will come with JWT later.)


def get_current_user(
    db: Session = Depends(get_db),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> User:
    if not x_user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-Email header",
        )

    email = x_user_email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user",
        )

    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ---------------------------
# Legacy admin-header method (kept for backward compatibility)
# ---------------------------

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
    """Returns user profile on success.

    We are not returning a token yet; frontend stores profile in localStorage.
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


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    """Return current user based on X-User-Email header."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": getattr(current_user, "full_name", None),
        "role": _get_user_role(current_user),
        "is_active": getattr(current_user, "is_active", True),
    }


@router.post("/users")
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    # New preferred method: authenticated admin header
    current_admin: User = Depends(require_admin),
    # Legacy method: allow old clients/scripts to keep working
    x_admin_email: str | None = Header(default=None, alias="X-Admin-Email"),
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
):
    """Admin-protected user creation.

    Preferred: Send `X-User-Email` for an ADMIN user.
    Legacy: Send `X-Admin-Email` + `X-Admin-Password`.
    """
    # If someone is using the legacy admin headers, validate them too.
    # (If not provided, require_admin already enforced access.)
    if x_admin_email or x_admin_password:
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
        "created_by": current_admin.email,
    }