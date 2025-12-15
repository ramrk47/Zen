from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    role: str
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