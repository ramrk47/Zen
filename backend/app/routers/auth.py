# backend/app/routers/auth.py
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.user import CreateUserRequest, LoginRequest
from app.utils.security import hash_password, verify_password

# ✅ JWT helpers
from app.utils.jwt import create_access_token, decode_token

# ✅ RBAC helpers
from app.utils.rbac import get_permissions_for_role, seed_rbac_if_empty

router = APIRouter(prefix="/api/auth", tags=["auth"])

bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------
# Compatibility helpers
# ---------------------------

def _get_user_role(user: User) -> str:
    role = getattr(user, "role", None)
    return str(role) if role is not None else ""


def _get_user_password_hash(user: User) -> str:
    """
    Return the stored password hash.

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


# Central allowed roles list (keep in sync with frontend ROLE_OPTIONS)
ALLOWED_ROLES: set[str] = {
    "ADMIN",
    "OPS_MANAGER",
    "ASSISTANT_VALUER",
    "FIELD_VALUER",
    "FINANCE",
    "HR",
    "EMPLOYEE",
}


def _normalize_role(role: str | None) -> str | None:
    if role is None:
        return None
    r = str(role).strip().upper()
    return r or None


def _has_any_role(user: User, roles: set[str]) -> bool:
    return _get_user_role(user).upper() in {r.upper() for r in roles}


def _require_roles(user: User, roles: set[str]) -> None:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if not _has_any_role(user, roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access required: " + ", ".join(sorted(roles)))


def _ensure_active(user: User) -> None:
    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )


# ---------------------------
# Auth resolution (JWT first, header fallback)
# ---------------------------

def _get_user_by_email(db: Session, email: str) -> User:
    u = db.query(User).filter(User.email == email.strip().lower()).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    _ensure_active(u)
    return u


def get_current_user(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> User:
    """
    ✅ Dual-mode:
      1) Prefer JWT via Authorization: Bearer <token>
      2) Fallback to X-User-Email for older clients (temporary)
    """
    # Prefer JWT
    if creds and creds.scheme and creds.scheme.lower() == "bearer" and creds.credentials:
        payload = decode_token(creds.credentials)
        subject = (payload.get("sub") or "").strip().lower()
        if not subject:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
        return _get_user_by_email(db, subject)

    # Fallback header (temporary)
    if x_user_email:
        return _get_user_by_email(db, x_user_email)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing Authorization Bearer token (or X-User-Email header)",
    )


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    _require_roles(current_user, {"ADMIN"})
    return current_user


def require_admin_or_hr(current_user: User = Depends(get_current_user)) -> User:
    # HR role is optional today, but this keeps Manage Personnel extensible.
    _require_roles(current_user, {"ADMIN", "HR"})
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing admin credentials")

    admin = db.query(User).filter(User.email == admin_email.strip().lower()).first()
    if not admin or not _is_admin(admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    _ensure_active(admin)

    admin_hash = _get_user_password_hash(admin)
    if not verify_password(admin_password, admin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

    return admin


# ---------------------------
# Personnel action schemas
# ---------------------------

class ToggleActiveRequest(BaseModel):
    is_active: bool = Field(..., description="Set user active/inactive")


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)


class UpdateUserRequest(BaseModel):
    """Admin/HR can update full_name. Only ADMIN can change role."""

    full_name: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=20)


# ---------------------------
# Routes
# ---------------------------

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    ✅ JWT login:
      - Validates credentials
      - Returns:
          { access_token, token_type, user: {...} }
    """
    seed_rbac_if_empty(db)

    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    _ensure_active(user)

    user_hash = _get_user_password_hash(user)
    if not verify_password(payload.password, user_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    role = _get_user_role(user)
    perms = get_permissions_for_role(db, role)

    access_token = create_access_token(
        subject=user.email,
        extra={"role": role},
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": getattr(user, "full_name", None),
            "role": role,
            "is_active": getattr(user, "is_active", True),
            "permissions": perms,
        },
    }


@router.get("/me")
def me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """✅ Return current user (JWT preferred, header fallback)."""
    seed_rbac_if_empty(db)
    role = _get_user_role(current_user)
    perms = get_permissions_for_role(db, role)

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": getattr(current_user, "full_name", None),
        "role": role,
        "is_active": getattr(current_user, "is_active", True),
        "permissions": perms,
    }


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_admin_or_hr),
):
    """✅ Admin-only: list all users for Manage Personnel."""
    seed_rbac_if_empty(db)

    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": getattr(u, "full_name", None),
            "role": _get_user_role(u),
            "is_active": getattr(u, "is_active", True),
        }
        for u in users
    ]


@router.post("/users")
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),

    # ✅ Preferred: JWT admin OR X-User-Email admin (via require_admin)
    current_admin: User | None = Depends(lambda: None),

    # ✅ Allow admin via JWT/header using require_admin when no legacy headers are used
    admin_user: User | None = Depends(get_current_user),

    # ✅ Legacy method: allow old clients/scripts to keep working
    x_admin_email: str | None = Header(default=None, alias="X-Admin-Email"),
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
):
    """
    ✅ Admin-protected user creation.

    Preferred:
      - Authorization: Bearer <token> (ADMIN), OR
      - X-User-Email: <admin email>  (temporary fallback, ADMIN)

    Legacy:
      - X-Admin-Email + X-Admin-Password
    """
    seed_rbac_if_empty(db)

    # Decide auth path:
    # If legacy headers present -> validate those.
    # Else -> require current user to be ADMIN.
    if x_admin_email or x_admin_password:
        current_admin_user = _get_admin_from_headers(db, x_admin_email, x_admin_password)
    else:
        if not admin_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        if not _is_admin(admin_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        current_admin_user = admin_user

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
        "created_by": current_admin_user.email,
    }


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_admin_or_hr),
):
    """✅ Admin/HR: update user profile fields (role/full_name)."""
    seed_rbac_if_empty(db)

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)

    # full_name: ADMIN/HR allowed
    if "full_name" in data:
        target.full_name = (data["full_name"].strip() if data["full_name"] else None)

    # role: ADMIN only + validate
    if "role" in data and data["role"] is not None:
        if not _is_admin(current_staff):
            raise HTTPException(status_code=403, detail="Only ADMIN can change roles")

        # Prevent accidental self-demotion/lockout
        if int(getattr(current_staff, "id", 0) or 0) == int(user_id):
            raise HTTPException(status_code=400, detail="You cannot change your own role")

        new_role = _normalize_role(data["role"])
        if not new_role:
            raise HTTPException(status_code=400, detail="Invalid role")
        if new_role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Allowed: {', '.join(sorted(ALLOWED_ROLES))}")

        target.role = new_role

    db.add(target)
    db.commit()
    db.refresh(target)

    return {
        "id": target.id,
        "email": target.email,
        "full_name": getattr(target, "full_name", None),
        "role": _get_user_role(target),
        "is_active": getattr(target, "is_active", True),
    }


@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    payload: ToggleActiveRequest,
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_admin_or_hr),
):
    """✅ Admin/HR: activate/deactivate user (soft)."""
    seed_rbac_if_empty(db)

    # Prevent locking yourself out by mistake.
    if int(getattr(current_staff, "id", 0) or 0) == int(user_id):
        raise HTTPException(status_code=400, detail="You cannot change your own active status")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Only ADMIN can deactivate another ADMIN
    if _get_user_role(target).upper() == "ADMIN" and not _is_admin(current_staff):
        raise HTTPException(status_code=403, detail="Only ADMIN can change an ADMIN user's active status")

    target.is_active = bool(payload.is_active)
    db.add(target)
    db.commit()
    db.refresh(target)

    return {
        "id": target.id,
        "email": target.email,
        "full_name": getattr(target, "full_name", None),
        "role": _get_user_role(target),
        "is_active": getattr(target, "is_active", True),
    }


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_admin_or_hr),
):
    """✅ Admin/HR: reset a user's password."""
    seed_rbac_if_empty(db)

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if _get_user_role(target).upper() == "ADMIN" and not _is_admin(current_staff):
        raise HTTPException(status_code=403, detail="Only ADMIN can reset an ADMIN password")

    # Optional: allow resetting inactive users too, but keep consistent.
    new_hash = hash_password(payload.new_password)
    _set_user_password_hash(target, new_hash)

    db.add(target)
    db.commit()

    return {"ok": True, "user_id": target.id}