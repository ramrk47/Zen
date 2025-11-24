from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.assignment import Assignment
from app.schemas.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from app.utils import events
from app.utils.assignment_code import generate_assignment_code

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


@router.get("/", response_model=List[AssignmentRead])
def list_assignments(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Assignment).order_by(Assignment.created_at.desc())
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
def create_assignment(payload: AssignmentCreate, db: Session = Depends(get_db)):

    assignment_code = generate_assignment_code(db)

    obj = Assignment(
        assignment_code=assignment_code,
        case_type=payload.case_type,
        bank_name=payload.bank_name,
        branch_name=payload.branch_name,
        borrower_name=payload.borrower_name,
        valuer_client_name=payload.valuer_client_name,
        phone=payload.phone,
        address=payload.address,
        property_type=payload.property_type,
        land_area=payload.land_area,
        builtup_area=payload.builtup_area,
        status=payload.status,
        assigned_to=payload.assigned_to,
        site_visit_date=payload.site_visit_date,
        report_due_date=payload.report_due_date,
        fees=payload.fees,
        is_paid=payload.is_paid,
        notes=payload.notes,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    events.on_assignment_created(obj)
    return obj


@router.get("/{assignment_id}", response_model=AssignmentRead)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    obj = db.query(Assignment).get(assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return obj

@router.get("/{assignment_id}/detail")
def get_assignment_detail(assignment_id: int, db: Session = Depends(get_db)):
    obj = db.query(Assignment).get(assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # For now, just return the assignment as a dict.
    # Later we will expand this with files, timeline, etc.
    return {
        "assignment": obj,
        "files": obj.files,  # will serialize because FileRead exists
    }

@router.patch("/{assignment_id}", response_model=AssignmentRead)
def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
):
    obj = db.query(Assignment).get(assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(obj, field, value)

    db.add(obj)
    db.commit()
    db.refresh(obj)
    events.on_assignment_updated(obj)
    return obj


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    obj = db.query(Assignment).get(assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(obj)
    db.commit()
    events.on_assignment_deleted(assignment_id)
    return None