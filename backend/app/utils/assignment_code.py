from datetime import datetime
from sqlalchemy.orm import Session
from app.models.assignment import Assignment

def generate_assignment_code(db: Session) -> str:
    year = datetime.utcnow().year

    last = (
        db.query(Assignment)
        .filter(Assignment.assignment_code.like(f"VAL/{year}/%"))
        .order_by(Assignment.id.desc())
        .first()
    )

    if last:
        last_code = int(last.assignment_code.split("/")[-1])
        new_seq = last_code + 1
    else:
        new_seq = 1

    return f"VAL/{year}/{new_seq:04d}"