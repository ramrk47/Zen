import os
from fastapi import APIRouter, UploadFile, File as UploadFileType, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.file import File
from app.models.assignment import Assignment

router = APIRouter(prefix="/api/files", tags=["files"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload/{assignment_id}")
async def upload_file(
    assignment_id: int,
    uploaded: UploadFile = UploadFileType(...),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # physical file path
    path = f"{UPLOAD_DIR}/{assignment_id}_{uploaded.filename}"

    # save file
    with open(path, "wb") as f:
        f.write(await uploaded.read())

    entry = File(
        assignment_id=assignment_id,
        filename=uploaded.filename,
        filepath=path,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"status": "ok", "file_id": entry.id}

@router.get("/{assignment_id}")
def list_files(assignment_id: int, db: Session = Depends(get_db)):
    files = (
        db.query(File)
        .filter(File.assignment_id == assignment_id)
        .order_by(File.uploaded_at.desc())
        .all()
    )
    return files