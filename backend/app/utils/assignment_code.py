from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.assignment import Assignment


def generate_assignment_code(db: Session) -> str:
    """Generate a monotonically increasing assignment code per year.

    Format: VAL/<year>/<0001>

    NOTE:
    - Do NOT rely on Assignment.id ordering (ids can have gaps due to deletes).
    - We order by assignment_code (zero-padded suffix) so the latest code is correct.
    """

    year = datetime.utcnow().year
    prefix = f"VAL/{year}/"

    last = (
        db.query(Assignment)
        .filter(
            and_(
                Assignment.assignment_code.isnot(None),
                Assignment.assignment_code.like(f"{prefix}%"),
            )
        )
        # assignment_code ends with zero-padded 4 digits, so lexicographic sort works
        .order_by(Assignment.assignment_code.desc())
        .first()
    )

    if last and last.assignment_code:
        try:
            last_code = int(str(last.assignment_code).split("/")[-1])
        except Exception:
            # If the last row has a malformed code, fall back safely
            last_code = 0
        new_seq = last_code + 1
    else:
        new_seq = 1

    return f"{prefix}{new_seq:04d}"