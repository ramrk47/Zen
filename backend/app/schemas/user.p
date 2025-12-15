# app/schemas/user.py
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    role: str
    token: str