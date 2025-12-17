# backend/app/routers/assignments.py
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.assignment import Assignment
from app.models.master_data import Bank, Branch, Client, PropertyType
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from app.schemas.file import FileRead
from app.utils.assignment_code import generate_assignment_code

# ✅ activity logger
from app.utils.activity import log_activity

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


# ---------------------------
# Helpers
# ---------------------------

def _normalize_case_type(ct: str | None) -> str:
    return (ct or "BANK").strip().upper()


def _normalize_completion(value: str | None) -> str:
    """
    Completion filter:
      - ALL (default)
      - PENDING (anything NOT completed)
      - COMPLETED (status == COMPLETED)
    """
    v = (value or "ALL").strip().upper()
    if v not in ("ALL", "PENDING", "COMPLETED"):
        raise HTTPException(status_code=400, detail="completion must be ALL, PENDING, or COMPLETED")
    return v


def _completed_status_value() -> str:
    # Single source of truth for "completed" meaning
    return "COMPLETED"


def _apply_date_range(query, created_from: date | None, created_to: date | None):
    if created_from is None and created_to is None:
        return query

    # created_from inclusive at 00:00:00
    if created_from is not None:
        start_dt = datetime.combine(created_from, time.min)
        query = query.filter(Assignment.created_at >= start_dt)

    # created_to inclusive -> filter < (to + 1 day at 00:00:00)
    if created_to is not None:
        end_dt = datetime.combine(created_to + timedelta(days=1), time.min)
        query = query.filter(Assignment.created_at < end_dt)

    return query


def _apply_filters(
    query,
    bank_id: int | None,
    branch_id: int | None,
    created_from: date | None,
    created_to: date | None,
    completion: str,
    is_paid: bool | None,
):
    if bank_id is not None:
        query = query.filter(Assignment.bank_id == bank_id)

    if branch_id is not None:
        query = query.filter(Assignment.branch_id == branch_id)

    query = _apply_date_range(query, created_from, created_to)

    completed_value = _completed_status_value()

    if completion == "COMPLETED":
        query = query.filter(func.upper(func.coalesce(Assignment.status, "")) == completed_value)
    elif completion == "PENDING":
        # pending = NOT completed (includes NULL/blank status)
        query = query.filter(func.upper(func.coalesce(Assignment.status, "")) != completed_value)

    if is_paid is not None:
        query = query.filter(Assignment.is_paid == is_paid)

    return query


def _apply_sort(query, sort_by: str, sort_dir: str):
    sort_by = (sort_by or "created_at").strip().lower()
    sort_dir = (sort_dir or "desc").strip().lower()

    if sort_dir not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="sort_dir must be asc or desc")

    allowed = {
        "created_at": Assignment.created_at,
        "status": Assignment.status,
        "fees": Assignment.fees,
        "is_paid": Assignment.is_paid,
        "assignment_code": Assignment.assignment_code,
        "id": Assignment.id,
    }

    col = allowed.get(sort_by)
    if col is None:
        raise HTTPException(
            status_code=400,
            detail=f"sort_by must be one of: {', '.join(sorted(allowed.keys()))}",
        )

    return query.order_by(col.asc() if sort_dir == "asc" else col.desc())


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

        if bank_id is not None and branch.bank_id != bank_id:
            raise HTTPException(status_code=400, detail="branch_id does not belong to bank_id")

    if client_id is not None:
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=400, detail="Invalid client_id")
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
            raise HTTPException(
                status_code=400,
                detail=f"{ct} case requires client_id (or valuer_client_name)",
            )


def _is_admin(user: User) -> bool:
    return (getattr(user, "role", "") or "").upper() == "ADMIN"


# ---------------------------
# List + Summary (filters live here)
# ---------------------------

@router.get("/", response_model=List[AssignmentRead])
def list_assignments(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),

    bank_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),

    created_from: Optional[date] = Query(default=None, description="YYYY-MM-DD"),
    created_to: Optional[date] = Query(default=None, description="YYYY-MM-DD"),

    completion: Optional[str] = Query(default="ALL", description="ALL | PENDING | COMPLETED"),
    is_paid: Optional[bool] = Query(default=None),

    sort_by: Optional[str] = Query(default="created_at"),
    sort_dir: Optional[str] = Query(default="desc"),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Core endpoint used by:
      - Assignments page
      - Bank detail table
      - Branch detail table

    Filters:
      - bank_id, branch_id
      - created_from, created_to (YYYY-MM-DD)
      - completion: ALL | PENDING | COMPLETED
      - is_paid: true/false
      - sort_by + sort_dir
    """
    completion_norm = _normalize_completion(completion)

    query = db.query(Assignment)
    query = _apply_filters(query, bank_id, branch_id, created_from, created_to, completion_norm, is_paid)
    query = _apply_sort(query, sort_by or "created_at", sort_dir or "desc")

    return query.offset(skip).limit(limit).all()


@router.get("/summary")
def assignments_summary(
    bank_id: Optional[int] = Query(default=None),
    branch_id: Optional[int] = Query(default=None),

    created_from: Optional[date] = Query(default=None, description="YYYY-MM-DD"),
    created_to: Optional[date] = Query(default=None, description="YYYY-MM-DD"),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Fast counts for tiles + headers.

    Returns:
      - total
      - pending
      - completed
      - completed_unpaid
    """
    completed_value = _completed_status_value()

    base = db.query(Assignment)

    # Only apply bank/branch + date filters here (NOT is_paid / completion)
    base = _apply_filters(base, bank_id, branch_id, created_from, created_to, "ALL", None)

    status_upper = func.upper(func.coalesce(Assignment.status, ""))

    total = base.with_entities(func.count(Assignment.id)).scalar() or 0

    completed = base.with_entities(
        func.count(
            case((status_upper == completed_value, 1))
        )
    ).scalar() or 0

    pending = base.with_entities(
        func.count(
            case((status_upper != completed_value, 1))
        )
    ).scalar() or 0

    completed_unpaid = base.with_entities(
        func.count(
            case(((status_upper == completed_value) & (Assignment.is_paid == False), 1))  # noqa: E712
        )
    ).scalar() or 0

    return {
        "total": int(total),
        "pending": int(pending),
        "completed": int(completed),
        "completed_unpaid": int(completed_unpaid),
    }


# ---------------------------
# Create / Read / Detail / Update / Delete
# ---------------------------

@router.post("/", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment_code = generate_assignment_code(db)

    data = payload.model_dump()
    data["case_type"] = _normalize_case_type(data.get("case_type"))

    data = _fill_names_from_ids(data, db)
    _validate_by_case_type(data["case_type"], data)

    # employees cannot set money fields
    if not _is_admin(current_user):
        data["fees"] = 0
        data["is_paid"] = False

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

    log_activity(
        db,
        assignment_id=obj.id,
        type="ASSIGNMENT_CREATED",
        actor=current_user,
        payload={
            "assignment_code": obj.assignment_code,
            "case_type": obj.case_type,
            "bank_name": obj.bank_name,
            "branch_name": obj.branch_name,
            "valuer_client_name": obj.valuer_client_name,
        },
    )

    return obj


@router.get("/{assignment_id}", response_model=AssignmentRead)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(Assignment).get(assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return obj


@router.get("/{assignment_id}/detail")
def get_assignment_detail(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(Assignment).get(assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment_out = AssignmentRead.model_validate(obj).model_dump()
    files_out = [FileRead.model_validate(f).model_dump() for f in (obj.files or [])]
    return {"assignment": assignment_out, "files": files_out}


@router.patch("/{assignment_id}", response_model=AssignmentRead)
def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(Assignment).get(assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")

    before_status = obj.status
    update_data = payload.model_dump(exclude_unset=True)

    # employees cannot change money fields
    if not _is_admin(current_user):
        update_data.pop("fees", None)
        update_data.pop("is_paid", None)

    if "case_type" in update_data:
        update_data["case_type"] = _normalize_case_type(update_data.get("case_type"))

    update_data = _fill_names_from_ids(update_data, db)

    ct = update_data.get("case_type") or obj.case_type
    _validate_by_case_type(ct, {**obj.__dict__, **update_data})

    changed_fields = []
    for field, value in update_data.items():
        old = getattr(obj, field, None)
        if old != value:
            changed_fields.append(field)
        setattr(obj, field, value)

    db.add(obj)
    db.commit()
    db.refresh(obj)

    if changed_fields:
        log_activity(
            db,
            assignment_id=obj.id,
            type="ASSIGNMENT_UPDATED",
            actor=current_user,
            payload={"changed_fields": changed_fields},
        )

    if "status" in update_data and before_status != obj.status:
        log_activity(
            db,
            assignment_id=obj.id,
            type="STATUS_CHANGED",
            actor=current_user,
            payload={"from": before_status, "to": obj.status},
        )

    return obj


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = db.query(Assignment).get(assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")

    log_activity(
        db,
        assignment_id=obj.id,
        type="ASSIGNMENT_DELETED",
        actor=current_user,
        payload={"assignment_code": obj.assignment_code},
    )

    db.delete(obj)
    db.commit()
    return None