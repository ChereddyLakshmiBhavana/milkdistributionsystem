from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import MilkEntry, MonthlyBill, User, UserRole, UserStatus
from app.schemas.milk_entry import MilkEntryCreate, MilkEntryOut, MilkEntryUpdate
from app.services.audit_service import create_audit_log
from app.services.milk_service import calculate_amount

router = APIRouter(prefix="/admin/milk-entries", tags=["admin-milk-entries"])


def _ensure_month_unlocked(db: Session, customer_id: int, entry_date: date) -> None:
    month_start = entry_date.replace(day=1)
    bill = db.scalar(
        select(MonthlyBill).where(MonthlyBill.customer_id == customer_id, MonthlyBill.month_start == month_start)
    )
    if bill and bill.is_locked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This month is locked. Unlock bill month to modify entries.")


@router.post("", response_model=MilkEntryOut, status_code=status.HTTP_201_CREATED)
def create_milk_entry(payload: MilkEntryCreate, db: Session = Depends(get_db), current_admin=Depends(require_admin)):
    customer = db.get(User, payload.customer_id)
    if not customer or customer.role != UserRole.CUSTOMER or customer.status != UserStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approved customer not found")

    _ensure_month_unlocked(db, payload.customer_id, payload.entry_date)

    amount = calculate_amount(payload.quantity_liters)
    entry = MilkEntry(
        customer_id=payload.customer_id,
        entry_date=payload.entry_date,
        quantity_liters=payload.quantity_liters,
        amount=amount,
    )
    db.add(entry)
    db.flush()
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="MILK_ENTRY_CREATED",
        entity_type="MILK_ENTRY",
        entity_id=str(entry.id),
        details=f"Created milk entry for customer_id={entry.customer_id}, date={entry.entry_date}, liters={entry.quantity_liters}",
    )
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=list[MilkEntryOut])
def list_entries(
    customer_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    entries = db.scalars(
        select(MilkEntry)
        .where(MilkEntry.customer_id == customer_id, MilkEntry.entry_date >= start_date, MilkEntry.entry_date <= end_date)
        .order_by(MilkEntry.entry_date)
    )
    return list(entries)


@router.patch("/{entry_id}", response_model=MilkEntryOut)
def update_entry(entry_id: int, payload: MilkEntryUpdate, db: Session = Depends(get_db), current_admin=Depends(require_admin)):
    entry = db.get(MilkEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    _ensure_month_unlocked(db, entry.customer_id, entry.entry_date)

    previous_quantity = entry.quantity_liters
    entry.quantity_liters = payload.quantity_liters
    entry.amount = calculate_amount(payload.quantity_liters)
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="MILK_ENTRY_UPDATED",
        entity_type="MILK_ENTRY",
        entity_id=str(entry.id),
        details=f"Updated liters from {previous_quantity} to {entry.quantity_liters} for date={entry.entry_date}",
    )
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, db: Session = Depends(get_db), current_admin=Depends(require_admin)):
    entry = db.get(MilkEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    _ensure_month_unlocked(db, entry.customer_id, entry.entry_date)

    details = f"Deleted milk entry customer_id={entry.customer_id}, date={entry.entry_date}, liters={entry.quantity_liters}"
    db.delete(entry)
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="MILK_ENTRY_DELETED",
        entity_type="MILK_ENTRY",
        entity_id=str(entry_id),
        details=details,
    )
    db.commit()
