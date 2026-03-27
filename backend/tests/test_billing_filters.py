from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import require_admin
from app.db.session import Base, get_db
from app.main import app
from app.models import BillStatus, MonthlyBill, User, UserRole, UserStatus


def _build_client_with_bills(tmp_path):
    db_file = tmp_path / "test_billing_filters.db"
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
        phone="9222222200",
        address="HQ",
        password_hash="hash",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
    )
    customer = User(
        name="Customer One",
        phone="9222222201",
        address="Town",
        password_hash="hash",
        role=UserRole.CUSTOMER,
        status=UserStatus.APPROVED,
    )
    bootstrap_db.add_all([admin, customer])
    bootstrap_db.flush()

    bootstrap_db.add_all(
        [
            MonthlyBill(
                customer_id=customer.id,
                month_start=date(2026, 1, 1),
                month_end=date(2026, 1, 31),
                total_amount=Decimal("100.00"),
                previous_due=Decimal("0.00"),
                payable_amount=Decimal("100.00"),
                paid_amount=Decimal("100.00"),
                unpaid_amount=Decimal("0.00"),
                status=BillStatus.PAID,
                is_locked=True,
            ),
            MonthlyBill(
                customer_id=customer.id,
                month_start=date(2026, 2, 1),
                month_end=date(2026, 2, 28),
                total_amount=Decimal("110.00"),
                previous_due=Decimal("0.00"),
                payable_amount=Decimal("110.00"),
                paid_amount=Decimal("0.00"),
                unpaid_amount=Decimal("110.00"),
                status=BillStatus.UNPAID,
                is_locked=False,
            ),
            MonthlyBill(
                customer_id=customer.id,
                month_start=date(2026, 3, 1),
                month_end=date(2026, 3, 31),
                total_amount=Decimal("120.00"),
                previous_due=Decimal("10.00"),
                payable_amount=Decimal("130.00"),
                paid_amount=Decimal("0.00"),
                unpaid_amount=Decimal("130.00"),
                status=BillStatus.UNPAID,
                is_locked=True,
            ),
        ]
    )
    bootstrap_db.commit()
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
    return client, engine, customer.id


def test_list_customer_bills_only_locked_filter(tmp_path):
    client, engine, customer_id = _build_client_with_bills(tmp_path)
    try:
        response = client.get(
            f"/api/v1/admin/bills/customer/{customer_id}",
            params={"only_locked": True},
        )

        assert response.status_code == 200
        items = response.json()
        assert len(items) == 2
        assert all(item["is_locked"] is True for item in items)
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_list_customer_bills_only_unpaid_filter(tmp_path):
    client, engine, customer_id = _build_client_with_bills(tmp_path)
    try:
        response = client.get(
            f"/api/v1/admin/bills/customer/{customer_id}",
            params={"only_unpaid": True},
        )

        assert response.status_code == 200
        items = response.json()
        assert len(items) == 2
        assert all(item["status"] == "UNPAID" for item in items)
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_list_customer_bills_combined_filters(tmp_path):
    client, engine, customer_id = _build_client_with_bills(tmp_path)
    try:
        response = client.get(
            f"/api/v1/admin/bills/customer/{customer_id}",
            params={"only_locked": True, "only_unpaid": True},
        )

        assert response.status_code == 200
        items = response.json()
        assert len(items) == 1
        assert items[0]["is_locked"] is True
        assert items[0]["status"] == "UNPAID"
        assert items[0]["month_start"] == "2026-03-01"
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
