from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import BillStatus, MonthlyBill, Payment


def pay_full_bill(db: Session, bill_id: int, amount: Decimal) -> Payment:
    bill = db.get(MonthlyBill, bill_id)
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    if bill.unpaid_amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bill is already paid")

    if amount != bill.unpaid_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only full payment is allowed. Partial or advance payment is not allowed.",
        )

    payment = Payment(customer_id=bill.customer_id, bill_id=bill.id, amount=amount)
    bill.paid_amount = Decimal(bill.paid_amount) + amount
    bill.unpaid_amount = Decimal("0.00")
    bill.status = BillStatus.PAID

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
