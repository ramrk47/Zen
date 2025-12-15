# backend/app/schemas/file.py
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class FileRead(BaseModel):
    id: int
    assignment_id: int
    filename: str
    filepath: str | None = None
    stored_name: str | None = None
    content_type: str | None = None
    size_bytes: int | None = None
    uploaded_at: datetime

    # convenience for frontend
    download_url: str

    @classmethod
    def from_orm_file(cls, f) -> "FileRead":
        return cls(
            id=f.id,
            assignment_id=f.assignment_id,
            filename=f.filename,
            filepath=getattr(f, "filepath", None),
            stored_name=getattr(f, "stored_name", None),
            content_type=getattr(f, "content_type", None),
            size_bytes=getattr(f, "size_bytes", None),
            uploaded_at=f.uploaded_at,
            download_url=f"/api/files/{f.id}/download",
        )

    class Config:
        from_attributes = True