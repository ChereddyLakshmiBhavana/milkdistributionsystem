from calendar import monthrange
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import BillStatus, MilkEntry, MonthlyBill


def get_month_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def build_or_update_monthly_bill(db: Session, customer_id: int, year: int, month: int) -> MonthlyBill:
    month_start, month_end = get_month_bounds(year, month)

    total_amount = db.scalar(
        select(func.coalesce(func.sum(MilkEntry.amount), 0)).where(
            MilkEntry.customer_id == customer_id,
            MilkEntry.entry_date >= month_start,
            MilkEntry.entry_date <= month_end,
        )
    )
    total_amount = Decimal(total_amount)

    previous_due = db.scalar(
        select(func.coalesce(func.sum(MonthlyBill.unpaid_amount), 0)).where(
            MonthlyBill.customer_id == customer_id,
            MonthlyBill.month_start < month_start,
            MonthlyBill.unpaid_amount > 0,
        )
    )
    previous_due = Decimal(previous_due)

    payable = total_amount + previous_due

    bill = db.scalar(
        select(MonthlyBill).where(
            MonthlyBill.customer_id == customer_id,
            MonthlyBill.month_start == month_start,
        )
    )

    if bill is None:
        bill = MonthlyBill(
            customer_id=customer_id,
            month_start=month_start,
            month_end=month_end,
            total_amount=total_amount,
            previous_due=previous_due,
            payable_amount=payable,
            paid_amount=Decimal("0.00"),
            unpaid_amount=payable,
            status=BillStatus.UNPAID,
        )
        db.add(bill)
    else:
        bill.total_amount = total_amount
        bill.previous_due = previous_due
        bill.payable_amount = payable
        if bill.paid_amount > payable:
            bill.paid_amount = Decimal("0.00")
        bill.unpaid_amount = payable - bill.paid_amount
        bill.status = BillStatus.PAID if bill.unpaid_amount == 0 else BillStatus.UNPAID

    db.commit()
    db.refresh(bill)
    return bill
