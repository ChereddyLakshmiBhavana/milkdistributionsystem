from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import User, UserRole, UserStatus

DEFAULT_ADMIN_NAME = "Bhavana"
DEFAULT_ADMIN_PHONE = "9701984413"
DEFAULT_ADMIN_PASSWORD = "Bhavana@2006"


def seed_default_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.phone == DEFAULT_ADMIN_PHONE))
        if existing:
            existing.role = UserRole.ADMIN
            existing.status = UserStatus.APPROVED
            db.commit()
            return

        admin = User(
            name=DEFAULT_ADMIN_NAME,
            phone=DEFAULT_ADMIN_PHONE,
            address="",
            password_hash=get_password_hash(DEFAULT_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()
