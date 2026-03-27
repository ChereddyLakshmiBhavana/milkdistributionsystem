from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import require_admin
from app.db.session import Base, get_db
from app.main import app
from app.models import MilkEntry, User, UserRole, UserStatus


def _build_client(tmp_path):
    db_file = tmp_path / "test_admin_entries_by_date.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    bootstrap_db = testing_session_local()
    admin = User(
        name="Admin",
        phone="9555555555",
        address="HQ",
        password_hash="hash",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
    )
    c1 = User(
        name="Customer One",
        phone="9666666666",
        address="Addr 1",
        password_hash="hash",
        role=UserRole.CUSTOMER,
        status=UserStatus.APPROVED,
    )
    c2 = User(
        name="Customer Two",
        phone="9777777777",
        address="Addr 2",
        password_hash="hash",
        role=UserRole.CUSTOMER,
        status=UserStatus.APPROVED,
    )
    bootstrap_db.add_all([admin, c1, c2])
    bootstrap_db.flush()

    bootstrap_db.add_all(
        [
            MilkEntry(
                customer_id=c1.id,
                entry_date=date(2026, 3, 20),
                quantity_liters=Decimal("0.50"),
                amount=Decimal("43.00"),
            ),
            MilkEntry(
                customer_id=c1.id,
                entry_date=date(2026, 3, 20),
                quantity_liters=Decimal("1.00"),
                amount=Decimal("86.00"),
            ),
            MilkEntry(
                customer_id=c2.id,
                entry_date=date(2026, 3, 20),
                quantity_liters=Decimal("0.75"),
                amount=Decimal("65.00"),
            ),
            MilkEntry(
                customer_id=c2.id,
                entry_date=date(2026, 3, 21),
                quantity_liters=Decimal("1.00"),
                amount=Decimal("86.00"),
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

    return client, engine


def test_admin_entries_by_date_summary(tmp_path):
    client, engine = _build_client(tmp_path)
    try:
        response = client.get(
            "/api/v1/admin/milk-entries/by-date",
            params={"entry_date": "2026-03-20"},
        )

        assert response.status_code == 200
        rows = response.json()
        assert len(rows) == 2

        c1_row = next(row for row in rows if row["customer_name"] == "Customer One")
        assert c1_row["total_liters"] == "1.50"
        assert c1_row["total_amount"] == "129.00"
        assert c1_row["entry_count"] == 2

        c2_row = next(row for row in rows if row["customer_name"] == "Customer Two")
        assert c2_row["total_liters"] == "0.75"
        assert c2_row["total_amount"] == "65.00"
        assert c2_row["entry_count"] == 1
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
