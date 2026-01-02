# backend/app/routers/files.py
import os
import uuid
from typing import List

from fastapi import APIRouter, UploadFile, File as UploadFileType, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.file import File
from app.models.assignment import Assignment
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.file import FileRead

# ✅ NEW: activity logger
from app.utils.activity import log_activity

router = APIRouter(prefix="/api/files", tags=["files"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload/{assignment_id}", response_model=dict)
async def upload_file(
    assignment_id: int,
    uploaded: UploadFile = UploadFileType(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(Assignment).get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    original_name = uploaded.filename or "file"
    ext = os.path.splitext(original_name)[1].lower()

    stored_name = f"{assignment_id}_{uuid.uuid4().hex}{ext}"
    disk_path = os.path.join(UPLOAD_DIR, stored_name)  # uploads/<stored_name>

    content = await uploaded.read()
    size_bytes = len(content)

    with open(disk_path, "wb") as f:
        f.write(content)

    entry = File(
        assignment_id=assignment_id,
        filename=original_name,
        filepath=f"{UPLOAD_DIR}/{stored_name}",  # keep relative path
        stored_name=stored_name,
        content_type=uploaded.content_type,
        size_bytes=size_bytes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # ✅ ACTIVITY LOG
    log_activity(
        db,
        assignment_id=assignment_id,
        type="FILE_UPLOADED",
        actor=current_user,
        payload={
            "file_id": entry.id,
            "filename": entry.filename,
            "stored_name": entry.stored_name,
            "content_type": entry.content_type,
            "size_bytes": entry.size_bytes,
        },
    )

    return {"status": "ok", "file_id": entry.id}


@router.get("/{assignment_id}", response_model=List[FileRead])
def list_files(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    files = (
        db.query(File)
        .filter(File.assignment_id == assignment_id)
        .order_by(File.uploaded_at.desc())
        .all()
    )
    return [FileRead.model_validate(f) for f in files]


@router.get("/download/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    f = db.query(File).get(file_id)
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    # Safety: ensure assignment exists (prevents orphan leaks)
    a = db.query(Assignment).get(f.assignment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    rel_path = f.filepath or ""
    if not rel_path:
        raise HTTPException(status_code=404, detail="File missing on server")

    # Resolve relative path safely
    disk_path = rel_path if os.path.isabs(rel_path) else os.path.abspath(rel_path)

    if not os.path.exists(disk_path):
        raise HTTPException(status_code=404, detail="File missing on server")

    return FileResponse(
        path=disk_path,
        media_type=f.content_type or "application/octet-stream",
        filename=f.filename or os.path.basename(disk_path),
    )