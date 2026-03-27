from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_approved_customer
from app.db.session import get_db
from app.models import MonthlyBill, User
from app.schemas.bill import MonthlyBillOut

router = APIRouter(prefix="/customer/bills", tags=["customer-bills"])


@router.get("/me", response_model=list[MonthlyBillOut])
def my_bills(db: Session = Depends(get_db), current_user: User = Depends(require_approved_customer)):
    bills = db.scalars(
        select(MonthlyBill).where(MonthlyBill.customer_id == current_user.id).order_by(MonthlyBill.month_start.desc())
    )
    return list(bills)
