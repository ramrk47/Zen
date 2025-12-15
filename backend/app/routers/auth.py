from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    LoginResponse,
    CreateUserRequest,
    CreateUserResponse,
)
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _require_admin(db: Session, admin_email: str, admin_password: str) -> User:
    admin = db.query(User).filter(User.email == admin_email).first()
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    if not admin.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin is inactive")
    if admin.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an admin")
    if not verify_password(admin_password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    return admin


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Minimal login:
    - If no users exist: first login bootstraps an ADMIN user
    - Else: validates email + password
    """
    total_users = db.query(User).count()
    user = db.query(User).filter(User.email == payload.email).first()

    # Bootstrap first-ever admin
    if total_users == 0 and user is None:
        user = User(
            email=payload.email,
            full_name="Admin",
            hashed_password=hash_password(payload.password),
            role="ADMIN",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Placeholder token (we’ll replace with JWT later)
    token = "dev-token"

    return LoginResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        token=token,
    )


@router.post("/users", response_model=CreateUserResponse)
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    x_admin_email: str = Header(default="", alias="X-Admin-Email"),
    x_admin_password: str = Header(default="", alias="X-Admin-Password"),
):
    """
    DEV endpoint to create users (employees/admins).

    Requires existing ADMIN credentials via headers.

    Headers:
      X-Admin-Email: admin@example.com
      X-Admin-Password: your_admin_password
    """
    if not x_admin_email or not x_admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing admin headers (X-Admin-Email / X-Admin-Password)",
        )

    _require_admin(db, x_admin_email, x_admin_password)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    role = (payload.role or "EMPLOYEE").upper()
    if role not in {"ADMIN", "EMPLOYEE"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be ADMIN or EMPLOYEE")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return CreateUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
    )