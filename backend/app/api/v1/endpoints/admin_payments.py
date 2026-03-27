from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import Payment
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services.audit_service import create_audit_log
from app.services.payment_service import pay_full_bill

router = APIRouter(prefix="/admin/payments", tags=["admin-payments"])


@router.post("", response_model=PaymentOut)
def record_payment(payload: PaymentCreate, db: Session = Depends(get_db), current_admin=Depends(require_admin)):
    payment = pay_full_bill(db, bill_id=payload.bill_id, amount=payload.amount)
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="BILL_PAYMENT_RECORDED",
        entity_type="PAYMENT",
        entity_id=str(payment.id),
        details=f"Recorded full payment bill_id={payment.bill_id}, amount={payment.amount}",
    )
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/bill/{bill_id}", response_model=list[PaymentOut])
def list_bill_payments(bill_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    payments = db.scalars(select(Payment).where(Payment.bill_id == bill_id).order_by(Payment.paid_at.desc()))
    return list(payments)
