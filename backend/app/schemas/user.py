from pydantic import BaseModel
from typing import List, Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    role: str
    permissions: List[str] = []   # ✅ NEW
    token: str


class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: str | None = None


class CreateUserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    role: str
    is_active: bool