# app/schemas/user.py
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1)

class LoginResponse(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    role: str
    token: str