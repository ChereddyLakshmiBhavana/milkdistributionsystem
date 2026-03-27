from datetime import datetime

from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    address: str | None
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
