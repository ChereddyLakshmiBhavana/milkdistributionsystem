import csv
from calendar import monthrange
from datetime import date, datetime, time
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import AuditLog, MilkEntry, MonthlyBill, User

router = APIRouter(prefix="/admin/exports", tags=["admin-exports"])


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    if month < 1 or month > 12:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Month must be between 1 and 12")
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


@router.get("/monthly-entries.csv")
def export_monthly_entries(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    start, end = _month_bounds(year, month)
    entries = list(
        db.scalars(
            select(MilkEntry).where(MilkEntry.entry_date >= start, MilkEntry.entry_date <= end).order_by(MilkEntry.entry_date)
        )
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["entry_id", "entry_date", "customer_id", "customer_name", "quantity_liters", "amount"])

    for entry in entries:
        customer = db.get(User, entry.customer_id)
        writer.writerow(
            [
                entry.id,
                entry.entry_date,
                entry.customer_id,
                customer.name if customer else "",
                entry.quantity_liters,
                entry.amount,
            ]
        )

    filename = f"monthly_entries_{year}_{month:02d}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/monthly-bills.csv")
def export_monthly_bills(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    start, end = _month_bounds(year, month)
    bills = list(
        db.scalars(
            select(MonthlyBill)
            .where(MonthlyBill.month_start >= start, MonthlyBill.month_end <= end)
            .order_by(MonthlyBill.month_start)
        )
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "bill_id",
            "customer_id",
            "customer_name",
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
        customer = db.get(User, bill.customer_id)
        writer.writerow(
            [
                bill.id,
                bill.customer_id,
                customer.name if customer else "",
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

    filename = f"monthly_bills_{year}_{month:02d}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/audit-logs.csv")
def export_audit_logs(
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    q: str | None = Query(default=None),
    actor_user_id: int | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    stmt = select(AuditLog)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if actor_user_id is not None:
        stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                AuditLog.details.ilike(pattern),
                AuditLog.entity_id.ilike(pattern),
                AuditLog.action.ilike(pattern),
            )
        )
    if start_date is not None:
        stmt = stmt.where(AuditLog.created_at >= datetime.combine(start_date, time.min))
    if end_date is not None:
        stmt = stmt.where(AuditLog.created_at <= datetime.combine(end_date, time.max))

    logs = list(db.scalars(stmt.order_by(AuditLog.created_at.desc())))

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "created_at", "actor_user_id", "action", "entity_type", "entity_id", "details"])
    for log in logs:
        writer.writerow([log.id, log.created_at, log.actor_user_id, log.action, log.entity_type, log.entity_id, log.details])

    filename = "audit_logs.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
