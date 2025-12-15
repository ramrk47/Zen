# backend/app/routers/assignments.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.assignment import Assignment
from app.models.master_data import Bank, Branch, Client, PropertyType
from app.schemas.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from app.schemas.file import FileRead
from app.utils import events
from app.utils.assignment_code import generate_assignment_code

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


def _normalize_case_type(ct: str | None) -> str:
    return (ct or "BANK").strip().upper()


def _fill_names_from_ids(payload_dict: dict, db: Session) -> dict:
    """
    If *_id provided, fill legacy name fields.
    Also validates relationships (branch must belong to bank).
    """
    bank_id = payload_dict.get("bank_id")
    branch_id = payload_dict.get("branch_id")
    client_id = payload_dict.get("client_id")
    property_type_id = payload_dict.get("property_type_id")

    if bank_id is not None:
        bank = db.query(Bank).filter(Bank.id == bank_id).first()
        if not bank:
            raise HTTPException(status_code=400, detail="Invalid bank_id")
        payload_dict["bank_name"] = bank.name

    if branch_id is not None:
        branch = db.query(Branch).filter(Branch.id == branch_id).first()
        if not branch:
            raise HTTPException(status_code=400, detail="Invalid branch_id")
        payload_dict["branch_name"] = branch.name

        # If bank_id present, branch must match bank
        if bank_id is not None and branch.bank_id != bank_id:
            raise HTTPException(status_code=400, detail="branch_id does not belong to bank_id")

    if client_id is not None:
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=400, detail="Invalid client_id")
        # For now: we store client name in legacy field
        payload_dict["valuer_client_name"] = client.name

    if property_type_id is not None:
        pt = db.query(PropertyType).filter(PropertyType.id == property_type_id).first()
        if not pt:
            raise HTTPException(status_code=400, detail="Invalid property_type_id")
        payload_dict["property_type"] = pt.name

    return payload_dict


def _validate_by_case_type(case_type: str, data: dict):
    """
    Strict rules:
    - BANK: requires bank_id + branch_id (preferred). If IDs not given, bank_name+branch_name must exist.
    - EXTERNAL_VALUER / DIRECT_CLIENT: requires client_id (preferred) OR valuer_client_name.
    """
    ct = _normalize_case_type(case_type)

    if ct == "BANK":
        if data.get("bank_id") is None and not data.get("bank_name"):
            raise HTTPException(status_code=400, detail="BANK case requires bank_id (or bank_name)")
        if data.get("branch_id") is None and not data.get("branch_name"):
            raise HTTPException(status_code=400, detail="BANK case requires branch_id (or branch_name)")

    if ct in ("EXTERNAL_VALUER", "DIRECT_CLIENT"):
        if data.get("client_id") is None and not data.get("valuer_client_name"):
            raise HTTPException(status_code=400, detail=f"{ct} case requires client_id (or valuer_client_name)")


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

    data = payload.model_dump()
    data["case_type"] = _normalize_case_type(data.get("case_type"))

    # fill legacy names if IDs provided + validate IDs
    data = _fill_names_from_ids(data, db)

    # validate required fields by case_type
    _validate_by_case_type(data["case_type"], data)

    obj = Assignment(
        assignment_code=assignment_code,
        case_type=data["case_type"],

        bank_id=data.get("bank_id"),
        branch_id=data.get("branch_id"),
        client_id=data.get("client_id"),
        property_type_id=data.get("property_type_id"),

        bank_name=data.get("bank_name"),
        branch_name=data.get("branch_name"),
        valuer_client_name=data.get("valuer_client_name"),
        borrower_name=data.get("borrower_name"),
        phone=data.get("phone"),
        address=data.get("address"),
        property_type=data.get("property_type"),
        land_area=data.get("land_area"),
        builtup_area=data.get("builtup_area"),
        status=data.get("status"),
        assigned_to=data.get("assigned_to"),
        site_visit_date=data.get("site_visit_date"),
        report_due_date=data.get("report_due_date"),
        fees=data.get("fees"),
        is_paid=data.get("is_paid"),
        notes=data.get("notes"),
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

    # Return JSON-serializable data (avoid raw SQLAlchemy objects)
    assignment_out = AssignmentRead.model_validate(obj).model_dump()
    files_out = [FileRead.model_validate(f).model_dump() for f in (obj.files or [])]

    return {"assignment": assignment_out, "files": files_out}


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

    # If case_type is being updated, normalize it
    if "case_type" in update_data:
        update_data["case_type"] = _normalize_case_type(update_data.get("case_type"))

    # If IDs present, validate and fill legacy name fields
    update_data = _fill_names_from_ids(update_data, db)

    # Validate by (new or existing) case_type
    ct = update_data.get("case_type") or obj.case_type
    _validate_by_case_type(ct, {**obj.__dict__, **update_data})

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