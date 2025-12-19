from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import HTTPException, status

# ✅ Keep secret out of code. Set in env:
# export ZEN_JWT_SECRET="a-long-random-string"
JWT_SECRET = os.getenv("ZEN_JWT_SECRET", "dev-insecure-secret-change-me")
JWT_ALG = os.getenv("ZEN_JWT_ALG", "HS256")

# Minutes
ACCESS_TOKEN_TTL_MIN = int(os.getenv("ZEN_ACCESS_TOKEN_TTL_MIN", "720"))  # 12 hours default


def create_access_token(*, subject: str, extra: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=ACCESS_TOKEN_TTL_MIN)

    payload: Dict[str, Any] = {
        "sub": subject,  # usually email or user_id string
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "type": "access",
    }
    if extra:
        payload.update(extra)

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")