# backend/app/schemas/user.py
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"


def _basic_email_check(value: str) -> str:
    """
    Internal-app email validation (intentionally relaxed).
    Allows domains like .local which strict email validators reject.
    Non-negotiable: must contain '@' with non-empty left and right parts.
    """
    if value is None:
        raise ValueError("Email is required")

    v = value.strip().lower()
    if "@" not in v:
        raise ValueError("Email must contain '@'")
    left, right = v.split("@", 1)
    if not left or not right:
        raise ValueError("Email must have text before and after '@'")
    if " " in v:
        raise ValueError("Email must not contain spaces")
    return v


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email (relaxed validation)")
    password: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _basic_email_check(v)


class CreateUserRequest(BaseModel):
    email: str
    full_name: Optional[str] = None
    password: str = Field(..., min_length=4)
    role: UserRole = UserRole.EMPLOYEE

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _basic_email_check(v)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        vv = v.strip()
        return vv if vv else None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: UserRole

    class Config:
        from_attributes = True