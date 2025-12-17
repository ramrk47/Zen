from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.activity import Activity
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("/assignment/{assignment_id}")
def get_assignment_activity(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(Activity)
        .filter(Activity.assignment_id == assignment_id)
        .order_by(Activity.created_at.desc())
        .all()
    )

    # JSON-friendly output
    return [
        {
            "id": a.id,
            "type": a.type,
            "payload": a.payload,
            "actor_user_id": a.actor_user_id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in rows
    ]