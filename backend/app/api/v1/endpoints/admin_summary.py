from calendar import monthrange
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import MilkEntry, MonthlyBill, User, UserRole, UserStatus
from app.schemas.dashboard import AdminSummaryOut

router = APIRouter(prefix="/admin/summary", tags=["admin-summary"])


@router.get("", response_model=AdminSummaryOut)
def get_admin_summary(year: int, month: int, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    today = date.today()
    month_start = date(year, month, 1)
    month_end = date(year, month, monthrange(year, month)[1])

    total_customers = db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.CUSTOMER, User.status == UserStatus.APPROVED)
    )
    pending_approvals = db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.CUSTOMER, User.status == UserStatus.PENDING)
    )

    daily_total_liters = db.scalar(
        select(func.coalesce(func.sum(MilkEntry.quantity_liters), 0)).where(MilkEntry.entry_date == today)
    )

    monthly_income = db.scalar(
        select(func.coalesce(func.sum(MonthlyBill.paid_amount), 0)).where(
            MonthlyBill.month_start >= month_start,
            MonthlyBill.month_end <= month_end,
        )
    )

    pending_dues_total = db.scalar(select(func.coalesce(func.sum(MonthlyBill.unpaid_amount), 0)).where(MonthlyBill.unpaid_amount > 0))

    return AdminSummaryOut(
        total_customers=int(total_customers or 0),
        pending_approvals=int(pending_approvals or 0),
        daily_total_liters=Decimal(daily_total_liters or 0),
        monthly_income=Decimal(monthly_income or 0),
        pending_dues_total=Decimal(pending_dues_total or 0),
    )
