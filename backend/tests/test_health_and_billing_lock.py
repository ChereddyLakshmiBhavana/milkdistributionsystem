from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.main as main_module
from app.api.deps import require_admin
from app.db.session import Base, get_db
from app.main import app
from app.models import AuditLog, BillStatus, MonthlyBill, User, UserRole, UserStatus


@pytest.fixture()
def test_context(tmp_path):
    db_file = tmp_path / "test_app.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)

    db = testing_session_local()
    try:
        admin = User(
            name="Admin User",
            phone="9000000000",
            address="HQ",
            password_hash="hash",
            role=UserRole.ADMIN,
            status=UserStatus.APPROVED,
        )
        customer = User(
            name="Approved Customer",
            phone="9000000001",
            address="Town",
            password_hash="hash",
            role=UserRole.CUSTOMER,
            status=UserStatus.APPROVED,
        )
        db.add_all([admin, customer])
        db.flush()

        bill = MonthlyBill(
            customer_id=customer.id,
            month_start=date(2026, 3, 1),
            month_end=date(2026, 3, 31),
            total_amount=Decimal("86.00"),
            previous_due=Decimal("0.00"),
            payable_amount=Decimal("86.00"),
            paid_amount=Decimal("0.00"),
            unpaid_amount=Decimal("86.00"),
            status=BillStatus.UNPAID,
            is_locked=False,
        )
        db.add(bill)
        db.commit()

        yield {
            "engine": engine,
            "session_factory": testing_session_local,
            "admin_id": admin.id,
            "customer_id": customer.id,
            "bill_id": bill.id,
        }
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(test_context):
    def override_get_db():
        db = test_context["session_factory"]()
        try:
            yield db
        finally:
            db.close()

    def override_admin():
        return SimpleNamespace(id=test_context["admin_id"], role=UserRole.ADMIN)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_admin] = override_admin

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_health_ok(client):
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["checks"]["api"] == "ok"
    assert payload["checks"]["database"] == "ok"


def test_health_degraded_when_database_unavailable(client, monkeypatch):
    class FailingEngine:
        def connect(self):
            raise RuntimeError("database unavailable")

    monkeypatch.setattr(main_module, "engine", FailingEngine())

    response = client.get("/health")

    assert response.status_code == 503
    payload = response.json()
    assert payload["status"] == "degraded"
    assert payload["checks"]["api"] == "ok"
    assert payload["checks"]["database"] == "error"


def test_lock_and_unlock_bill_month_creates_audit_entries(client, test_context):
    bill_id = test_context["bill_id"]

    lock_response = client.post(f"/api/v1/admin/bills/{bill_id}/lock")
    assert lock_response.status_code == 200
    assert lock_response.json()["is_locked"] is True

    unlock_response = client.post(
        f"/api/v1/admin/bills/{bill_id}/unlock",
        json={"reason": "admin correction"},
    )
    assert unlock_response.status_code == 200
    assert unlock_response.json()["is_locked"] is False

    db = test_context["session_factory"]()
    try:
        logs = (
            db.query(AuditLog)
            .filter(AuditLog.entity_id == str(bill_id))
            .order_by(AuditLog.created_at.asc())
            .all()
        )
    finally:
        db.close()

    actions = [log.action for log in logs]
    assert "MONTH_LOCKED" in actions
    assert "MONTH_UNLOCKED" in actions

    unlock_log = next(log for log in logs if log.action == "MONTH_UNLOCKED")
    assert "Reason: admin correction" in unlock_log.details


def test_unlock_without_reason_uses_na_in_audit_details(client, test_context):
    bill_id = test_context["bill_id"]

    lock_response = client.post(f"/api/v1/admin/bills/{bill_id}/lock")
    assert lock_response.status_code == 200

    unlock_response = client.post(
        f"/api/v1/admin/bills/{bill_id}/unlock",
        json={},
    )
    assert unlock_response.status_code == 200
    assert unlock_response.json()["is_locked"] is False

    db = test_context["session_factory"]()
    try:
        unlock_logs = (
            db.query(AuditLog)
            .filter(AuditLog.entity_id == str(bill_id), AuditLog.action == "MONTH_UNLOCKED")
            .order_by(AuditLog.created_at.desc())
            .all()
        )
    finally:
        db.close()

    assert unlock_logs
    assert "Reason: N/A" in unlock_logs[0].details
