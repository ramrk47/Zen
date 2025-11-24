from datetime import datetime
from pydantic import BaseModel


class FileRead(BaseModel):
    id: int
    assignment_id: int
    filename: str
    filepath: str
    uploaded_at: datetime

    class Config:
        from_attributes = True