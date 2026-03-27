from sqlalchemy.orm import Session

from app.models import AuditLog


def create_audit_log(
    db: Session,
    actor_user_id: int,
    action: str,
    entity_type: str,
    entity_id: str,
    details: str,
) -> None:
    log = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(log)
