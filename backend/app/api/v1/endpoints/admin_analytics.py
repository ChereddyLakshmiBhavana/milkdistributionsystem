from calendar import monthrange
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import MonthlyBill
from app.schemas.analytics import MonthlyAnalyticsOut

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/monthly-collections", response_model=MonthlyAnalyticsOut)
def monthly_collections(
    year: int,
    month: int,
    months_back: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    if month < 1 or month > 12:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Month must be between 1 and 12")

    timeline: list[tuple[int, int]] = []
    y, m = year, month
    for _ in range(months_back):
        timeline.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    timeline.reverse()

    points = []
    for current_year, current_month in timeline:
        start = date(current_year, current_month, 1)
        end = date(current_year, current_month, monthrange(current_year, current_month)[1])
        bills = list(
            db.scalars(
                select(MonthlyBill).where(
                    MonthlyBill.month_start >= start,
                    MonthlyBill.month_end <= end,
                )
            )
        )

        paid = sum((Decimal(bill.paid_amount) for bill in bills), Decimal("0.00"))
        unpaid = sum((Decimal(bill.unpaid_amount) for bill in bills), Decimal("0.00"))
        payable = sum((Decimal(bill.payable_amount) for bill in bills), Decimal("0.00"))

        points.append(
            {
                "month_start": start,
                "paid_amount": paid,
                "unpaid_amount": unpaid,
                "payable_amount": payable,
            }
        )

    return {"months": points}
