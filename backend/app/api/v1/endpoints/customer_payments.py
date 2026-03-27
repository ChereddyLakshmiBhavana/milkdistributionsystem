from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_approved_customer
from app.db.session import get_db
from app.models import Payment, User
from app.schemas.payment import PaymentOut

router = APIRouter(prefix="/customer/payments", tags=["customer-payments"])


@router.get("/me", response_model=list[PaymentOut])
def my_payments(db: Session = Depends(get_db), current_user: User = Depends(require_approved_customer)):
    payments = db.scalars(
        select(Payment).where(Payment.customer_id == current_user.id).order_by(Payment.paid_at.desc())
    )
    return list(payments)
