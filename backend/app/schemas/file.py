from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    filename: str
    uploaded_at: datetime

    stored_name: Optional[str] = None
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None

    # Public URL for inline preview (served by StaticFiles mount: /uploads/...)
    url: Optional[str] = None