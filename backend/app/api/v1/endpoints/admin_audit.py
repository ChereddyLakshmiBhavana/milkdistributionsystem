from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import AuditLog
from app.schemas.audit_log import AuditLogPageOut

router = APIRouter(prefix="/admin/audit-logs", tags=["admin-audit"])


@router.get("", response_model=AuditLogPageOut)
def list_audit_logs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    q: str | None = Query(default=None),
    actor_user_id: int | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    stmt = select(AuditLog)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if actor_user_id is not None:
        stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                AuditLog.details.ilike(pattern),
                AuditLog.entity_id.ilike(pattern),
                AuditLog.action.ilike(pattern),
            )
        )
    if start_date is not None:
        stmt = stmt.where(AuditLog.created_at >= datetime.combine(start_date, time.min))
    if end_date is not None:
        stmt = stmt.where(AuditLog.created_at <= datetime.combine(end_date, time.max))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    logs = db.scalars(stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit))
    return {"items": list(logs), "total": int(total), "limit": limit, "offset": offset}
