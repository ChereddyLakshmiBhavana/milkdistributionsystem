import csv
from calendar import monthrange
from datetime import date
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_approved_customer
from app.db.session import get_db
from app.models import MilkEntry, MonthlyBill, User

router = APIRouter(prefix="/customer/exports", tags=["customer-exports"])


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    if month < 1 or month > 12:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Month must be between 1 and 12")
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


@router.get("/my-logs.csv")
def export_my_logs_csv(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_customer),
):
    start, end = _month_bounds(year, month)
    entries = list(
        db.scalars(
            select(MilkEntry)
            .where(MilkEntry.customer_id == current_user.id, MilkEntry.entry_date >= start, MilkEntry.entry_date <= end)
            .order_by(MilkEntry.entry_date)
        )
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["entry_id", "entry_date", "quantity_liters", "amount"])

    for entry in entries:
        writer.writerow([entry.id, entry.entry_date, entry.quantity_liters, entry.amount])

    filename = f"my_logs_{year}_{month:02d}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/my-bills.csv")
def export_my_bills_csv(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_customer),
):
    start, end = _month_bounds(year, month)
    bills = list(
        db.scalars(
            select(MonthlyBill)
            .where(
                MonthlyBill.customer_id == current_user.id,
                MonthlyBill.month_start >= start,
                MonthlyBill.month_end <= end,
            )
            .order_by(MonthlyBill.month_start)
        )
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "bill_id",
            "month_start",
            "month_end",
            "total_amount",
            "previous_due",
            "payable_amount",
            "paid_amount",
            "unpaid_amount",
            "status",
        ]
    )

    for bill in bills:
        writer.writerow(
            [
                bill.id,
                bill.month_start,
                bill.month_end,
                bill.total_amount,
                bill.previous_due,
                bill.payable_amount,
                bill.paid_amount,
                bill.unpaid_amount,
                bill.status.value,
            ]
        )

    filename = f"my_bills_{year}_{month:02d}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
