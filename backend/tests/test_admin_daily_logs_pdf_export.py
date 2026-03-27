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
    db_file = tmp_path / "test_daily_logs_pdf.db"
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
        phone="9222222222",
        address="HQ",
        password_hash="hash",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
    )
    customer = User(
        name="Customer One",
        phone="9333333333",
        address="Town",
        password_hash="hash",
        role=UserRole.CUSTOMER,
        status=UserStatus.APPROVED,
    )
    bootstrap_db.add_all([admin, customer])
    bootstrap_db.flush()

    bootstrap_db.add_all(
        [
            MilkEntry(
                customer_id=customer.id,
                entry_date=date(2026, 3, 2),
                quantity_liters=Decimal("0.50"),
                amount=Decimal("43.00"),
            ),
            MilkEntry(
                customer_id=customer.id,
                entry_date=date(2026, 3, 3),
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

    return client, engine, customer.id


def test_admin_daily_logs_pdf_export(tmp_path):
    client, engine, customer_id = _build_client(tmp_path)
    try:
        response = client.get(
            "/api/v1/admin/exports/daily-logs.pdf",
            params={
                "customer_id": customer_id,
                "year": 2026,
                "month": 3,
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/pdf")
        assert "attachment; filename=daily_logs_customer_" in response.headers.get(
            "content-disposition", ""
        )
        assert response.content.startswith(b"%PDF")
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
