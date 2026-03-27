from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import MonthlyBill, User, UserRole, UserStatus
from app.schemas.bill import MonthlyBillOut, MonthUnlockRequest
from app.services.audit_service import create_audit_log
from app.services.billing_service import build_or_update_monthly_bill, get_month_bounds

router = APIRouter(prefix="/admin/bills", tags=["admin-billing"])


@router.post("/generate/{customer_id}", response_model=MonthlyBillOut)
def generate_monthly_bill(
    customer_id: int,
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    customer = db.get(User, customer_id)
    if not customer or customer.role != UserRole.CUSTOMER or customer.status != UserStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approved customer not found")

    if month < 1 or month > 12:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Month must be between 1 and 12")

    month_start, _ = get_month_bounds(year, month)
    existing = db.scalar(
        select(MonthlyBill).where(MonthlyBill.customer_id == customer_id, MonthlyBill.month_start == month_start)
    )
    if existing and existing.is_locked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This month is locked. Unlock before regenerating bill.")

    bill = build_or_update_monthly_bill(db, customer_id=customer_id, year=year, month=month)
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="MONTHLY_BILL_GENERATED",
        entity_type="MONTHLY_BILL",
        entity_id=str(bill.id),
        details=f"Generated bill customer_id={customer_id}, month={year}-{month:02d}, payable={bill.payable_amount}",
    )
    db.commit()
    return bill


@router.get("/customer/{customer_id}", response_model=list[MonthlyBillOut])
def list_customer_bills(
    customer_id: int,
    only_locked: bool = Query(default=False),
    only_unpaid: bool = Query(default=False),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    customer = db.get(User, customer_id)
    if not customer or customer.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    query = db.query(MonthlyBill).filter(MonthlyBill.customer_id == customer_id)
    if only_locked:
        query = query.filter(MonthlyBill.is_locked.is_(True))
    if only_unpaid:
        query = query.filter(MonthlyBill.status != "PAID")
    return list(query.order_by(MonthlyBill.month_start.desc()).all())


@router.post("/{bill_id}/lock", response_model=MonthlyBillOut)
def lock_bill_month(bill_id: int, db: Session = Depends(get_db), current_admin=Depends(require_admin)):
    bill = db.get(MonthlyBill, bill_id)
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    bill.is_locked = True
    bill.locked_at = datetime.utcnow()
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="MONTH_LOCKED",
        entity_type="MONTHLY_BILL",
        entity_id=str(bill.id),
        details=f"Locked month {bill.month_start} for customer_id={bill.customer_id}",
    )
    db.commit()
    db.refresh(bill)
    return bill


@router.post("/{bill_id}/unlock", response_model=MonthlyBillOut)
def unlock_bill_month(
    bill_id: int,
    payload: MonthUnlockRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    bill = db.get(MonthlyBill, bill_id)
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    bill.is_locked = False
    bill.locked_at = None
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="MONTH_UNLOCKED",
        entity_type="MONTHLY_BILL",
        entity_id=str(bill.id),
        details=f"Unlocked month {bill.month_start} for customer_id={bill.customer_id}. Reason: {payload.reason or 'N/A'}",
    )
    db.commit()
    db.refresh(bill)
    return bill
