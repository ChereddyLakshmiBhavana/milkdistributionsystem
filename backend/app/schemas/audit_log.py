from datetime import datetime

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    actor_user_id: int
    action: str
    entity_type: str
    entity_id: str
    details: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogPageOut(BaseModel):
    items: list[AuditLogOut]
    total: int
    limit: int
    offset: int
