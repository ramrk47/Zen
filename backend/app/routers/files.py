import os
from pathlib import Path

from fastapi import APIRouter, Depends, File as UploadFileType, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.assignment import Assignment
from app.models.file import File
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/files", tags=["files"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload/{assignment_id}")
async def upload_file(
    assignment_id: int,
    uploaded: UploadFile = UploadFileType(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(Assignment).get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    safe_name = os.path.basename(uploaded.filename or "file")
    disk_name = f"{assignment_id}_{safe_name}"
    path = UPLOAD_DIR / disk_name

    content = await uploaded.read()
    with open(path, "wb") as f:
        f.write(content)

    entry = File(
        assignment_id=assignment_id,
        filename=safe_name,
        filepath=str(path),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"status": "ok", "file_id": entry.id}


@router.get("/{assignment_id}")
def list_files(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(Assignment).get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    files = (
        db.query(File)
        .filter(File.assignment_id == assignment_id)
        .order_by(File.uploaded_at.desc())
        .all()
    )
    return files


@router.get("/download/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(File).get(file_id)
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")

    path = Path(entry.filepath)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")

    return FileResponse(
        path=str(path),
        media_type="application/octet-stream",
        filename=entry.filename,
    )