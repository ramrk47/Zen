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


# ---------------------------
# Compatibility helpers
# ---------------------------

def _get_user_role(user: User) -> str:
    role = getattr(user, "role", None)
    return str(role) if role is not None else ""


def _normalize_role(role: str | None) -> str | None:
    if role is None:
        return None
    r = str(role).strip().upper()
    return r or None


def _is_admin(user: User) -> bool:
    return _get_user_role(user).upper() == "ADMIN"


def _is_hr(user: User) -> bool:
    return _get_user_role(user).upper() == "HR"


def _is_ops(user: User) -> bool:
    return _get_user_role(user).upper() == "OPS_MANAGER"


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


def _ensure_active(user: User) -> None:
    if getattr(user, "is_active", True) is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")


def _has_any_role(user: User, roles: set[str]) -> bool:
    return _get_user_role(user).upper() in {r.upper() for r in roles}


def _require_roles(user: User, roles: set[str]) -> None:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if not _has_any_role(user, roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access required: " + ", ".join(sorted(roles)),
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
    _require_roles(current_user, {"ADMIN", "HR"})
    return current_user


def require_admin_or_hr_or_ops(current_user: User = Depends(get_current_user)) -> User:
    # OPS_MANAGER is READ-ONLY in Manage Personnel (can view list, cannot mutate)
    _require_roles(current_user, {"ADMIN", "HR", "OPS_MANAGER"})
    return current_user


# ---------------------------
# Legacy admin-header method (kept for backward compatibility)
# ---------------------------

def _get_admin_from_headers(db: Session, admin_email: str | None, admin_password: str | None) -> User:
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
# Schemas
# ---------------------------

class ToggleActiveRequest(BaseModel):
    is_active: bool = Field(..., description="Set user active/inactive")


class UpdateUserRequest(BaseModel):
    """Admin/HR can update full_name/is_active. Only ADMIN can change role. Blocks self-role changes."""
    full_name: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=20)
    is_active: bool | None = Field(default=None, description="Set user active/inactive")


class ResetPasswordRequest(BaseModel):
    """
    Admin/HR resets a user's password (high power).
    - Requires staff re-auth (staff_password)
    - Requires explicit confirm = RESET
    """
    new_password: str = Field(..., min_length=6, max_length=128)
    staff_password: str = Field(..., min_length=1, max_length=128, description="Re-enter your own password to confirm")
    confirm: str = Field(..., min_length=1, max_length=16, description="Type RESET to confirm")


class ChangeMyPasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)


# ---------------------------
# Routes
# ---------------------------

@router.get("/capabilities")
@router.get("/capabilities/")
def capabilities(current_user: User = Depends(get_current_user)):
    """
    Frontend helper: tells UI what actions to show.
    Keep this simple and brutally consistent with backend enforcement.
    """
    role = _get_user_role(current_user).upper()
    return {
        "role": role,
        "can_view_users": role in {"ADMIN", "HR", "OPS_MANAGER"},
        "can_create_users": role == "ADMIN",
        "can_update_users": role in {"ADMIN", "HR"},
        "can_change_roles": role == "ADMIN",
        "ops_read_only": role == "OPS_MANAGER",
    }


@router.post("/login")
@router.post("/login/")
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

    access_token = create_access_token(subject=user.email, extra={"role": role})

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
@router.get("/me/")
def me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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


@router.post("/me/change-password")
@router.post("/me/change-password/")
def change_my_password(
    payload: ChangeMyPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ✅ Self-service password change.
    Requires current password.
    """
    seed_rbac_if_empty(db)

    _ensure_active(current_user)

    cur_hash = _get_user_password_hash(current_user)
    if not verify_password(payload.current_password, cur_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid current password")

    new_hash = hash_password(payload.new_password)
    _set_user_password_hash(current_user, new_hash)

    db.add(current_user)
    db.commit()

    return {"ok": True}


@router.get("/users")
@router.get("/users/")
def list_users(
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_admin_or_hr_or_ops),
):
    """✅ Admin/HR/OPS_MANAGER: list all users (OPS_MANAGER is read-only)."""
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
@router.post("/users/")
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    admin_user: User | None = Depends(get_current_user),
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

    if x_admin_email or x_admin_password:
        current_admin_user = _get_admin_from_headers(db, x_admin_email, x_admin_password)
    else:
        if not admin_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        if not _is_admin(admin_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        current_admin_user = admin_user

    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"User already exists: {email}")

    role = _normalize_role(payload.role or "EMPLOYEE") or "EMPLOYEE"
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed: {', '.join(sorted(ALLOWED_ROLES))}",
        )

    user = User(
        email=email,
        full_name=(payload.full_name.strip() if payload.full_name else None),
        role=role,
    )
    _set_user_password_hash(user, hash_password(payload.password))

    if hasattr(user, "is_active") and getattr(user, "is_active", None) is None:
        user.is_active = True

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
@router.patch("/users/{user_id}/")
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_admin_or_hr),
):
    """✅ Admin/HR: update user profile fields (full_name/is_active). Only ADMIN can change role."""
    seed_rbac_if_empty(db)

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)

    # full_name: ADMIN/HR allowed
    if "full_name" in data:
        target.full_name = (data["full_name"].strip() if data["full_name"] else None)

    # is_active: ADMIN/HR allowed
    if "is_active" in data and data["is_active"] is not None:
        if int(getattr(current_staff, "id", 0) or 0) == int(user_id):
            raise HTTPException(status_code=400, detail="You cannot change your own active status")

        if _get_user_role(target).upper() == "ADMIN" and not _is_admin(current_staff):
            raise HTTPException(status_code=403, detail="Only ADMIN can change an ADMIN user's active status")

        target.is_active = bool(data["is_active"])

    # role: ADMIN only
    if "role" in data and data["role"] is not None:
        if not _is_admin(current_staff):
            raise HTTPException(status_code=403, detail="Only ADMIN can change roles")

        if int(getattr(current_staff, "id", 0) or 0) == int(user_id):
            raise HTTPException(status_code=400, detail="You cannot change your own role")

        new_role = _normalize_role(data["role"])
        if not new_role or new_role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role '{new_role}'. Allowed: {', '.join(sorted(ALLOWED_ROLES))}",
            )

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
@router.patch("/users/{user_id}/toggle-active/")
def toggle_user_active(
    user_id: int,
    payload: ToggleActiveRequest,
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_admin_or_hr),
):
    """✅ Admin/HR: activate/deactivate user (soft)."""
    seed_rbac_if_empty(db)

    if int(getattr(current_staff, "id", 0) or 0) == int(user_id):
        raise HTTPException(status_code=400, detail="You cannot change your own active status")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

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
@router.post("/users/{user_id}/reset-password/")
def reset_user_password(
    user_id: int,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_staff: User = Depends(require_admin_or_hr),
):
    """✅ Admin/HR: reset a user's password (requires staff re-auth + explicit confirm)."""
    seed_rbac_if_empty(db)

    # Fail-safe 1: explicit confirm
    if (payload.confirm or "").strip().upper() != "RESET":
        raise HTTPException(status_code=400, detail="Confirmation required: type RESET")

    # Fail-safe 2: re-auth the staff member doing the reset
    staff_hash = _get_user_password_hash(current_staff)
    if not verify_password(payload.staff_password, staff_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid staff password")

    # Prevent self-reset via admin endpoint (use /me/change-password)
    if int(getattr(current_staff, "id", 0) or 0) == int(user_id):
        raise HTTPException(status_code=400, detail="You cannot reset your own password here; use /me/change-password")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if _get_user_role(target).upper() == "ADMIN" and not _is_admin(current_staff):
        raise HTTPException(status_code=403, detail="Only ADMIN can reset an ADMIN password")

    new_hash = hash_password(payload.new_password)
    _set_user_password_hash(target, new_hash)

    db.add(target)
    db.commit()

    return {"ok": True, "user_id": target.id}