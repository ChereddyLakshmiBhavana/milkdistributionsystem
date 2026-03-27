from datetime import datetime
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import require_admin
from app.db.session import Base, get_db
from app.main import app
from app.models import AuditLog, User, UserRole, UserStatus


def _seed_audit_logs(db, admin_id: int):
    db.add_all(
        [
            AuditLog(
                actor_user_id=admin_id,
                action="MONTH_LOCKED",
                entity_type="MONTHLY_BILL",
                entity_id="101",
                details="Locked month 2026-03-01",
                created_at=datetime(2026, 3, 10, 10, 0, 0),
            ),
            AuditLog(
                actor_user_id=admin_id,
                action="MONTH_UNLOCKED",
                entity_type="MONTHLY_BILL",
                entity_id="101",
                details="Unlocked month 2026-03-01. Reason: correction",
                created_at=datetime(2026, 3, 11, 10, 0, 0),
            ),
            AuditLog(
                actor_user_id=admin_id,
                action="PAYMENT_RECORDED",
                entity_type="PAYMENT",
                entity_id="501",
                details="Recorded full payment",
                created_at=datetime(2026, 3, 12, 10, 0, 0),
            ),
        ]
    )
    db.commit()


def _build_client(tmp_path):
    db_file = tmp_path / "test_audit.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    bootstrap_db = testing_session_local()
    admin = User(
        name="Admin User",
        phone="9111111111",
        address="HQ",
        password_hash="hash",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
    )
    bootstrap_db.add(admin)
    bootstrap_db.flush()
    _seed_audit_logs(bootstrap_db, admin.id)
    bootstrap_db.close()

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    def override_admin():
        return SimpleNamespace(id=admin.id, role=UserRole.ADMIN)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_admin] = override_admin
    client = TestClient(app)

    return client, engine


def test_audit_logs_filters_and_pagination(tmp_path):
    client, engine = _build_client(tmp_path)
    try:
        response = client.get(
            "/api/v1/admin/audit-logs",
            params={
                "action": "MONTH_UNLOCKED",
                "entity_type": "MONTHLY_BILL",
                "q": "correction",
                "start_date": "2026-03-01",
                "end_date": "2026-03-31",
                "limit": 10,
                "offset": 0,
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] == 1
        assert payload["limit"] == 10
        assert payload["offset"] == 0
        assert len(payload["items"]) == 1
        assert payload["items"][0]["action"] == "MONTH_UNLOCKED"
        assert payload["items"][0]["entity_type"] == "MONTHLY_BILL"
        assert "correction" in payload["items"][0]["details"]
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_audit_logs_csv_export_with_filters(tmp_path):
    client, engine = _build_client(tmp_path)
    try:
        response = client.get(
            "/api/v1/admin/exports/audit-logs.csv",
            params={
                "action": "PAYMENT_RECORDED",
                "entity_type": "PAYMENT",
                "q": "full",
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        assert "attachment; filename=audit_logs.csv" in response.headers.get("content-disposition", "")

        csv_text = response.text
        assert "id,created_at,actor_user_id,action,entity_type,entity_id,details" in csv_text
        assert "PAYMENT_RECORDED" in csv_text
        assert "Recorded full payment" in csv_text
        assert "MONTH_UNLOCKED" not in csv_text
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
