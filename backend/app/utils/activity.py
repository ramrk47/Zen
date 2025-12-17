from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.user import User


def log_activity(
    db: Session,
    *,
    assignment_id: int,
    type: str,
    actor: Optional[User] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> Activity:
    """
    Writes an activity row (audit log) for an assignment.

    Commits immediately so logs don't silently disappear.
    Payload must be JSON-serializable.
    """
    a = Activity(
        assignment_id=assignment_id,
        actor_user_id=actor.id if actor else None,
        type=type,
        payload=payload or {},
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a