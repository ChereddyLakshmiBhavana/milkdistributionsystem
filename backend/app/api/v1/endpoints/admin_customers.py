from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import User, UserRole, UserStatus
from app.schemas.user import UserOut
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/admin/customers", tags=["admin-customers"])


@router.get("/pending", response_model=list[UserOut])
def list_pending_customers(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return list(
        db.scalars(
            select(User).where(User.role == UserRole.CUSTOMER, User.status == UserStatus.PENDING).order_by(User.created_at)
        )
    )


@router.get("", response_model=list[UserOut])
def list_customers(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return list(db.scalars(select(User).where(User.role == UserRole.CUSTOMER).order_by(User.name)))


@router.patch("/{customer_id}/approve")
def approve_customer(customer_id: int, db: Session = Depends(get_db), current_admin=Depends(require_admin)):
    customer = db.get(User, customer_id)
    if not customer or customer.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    customer.status = UserStatus.APPROVED
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="CUSTOMER_APPROVED",
        entity_type="USER",
        entity_id=str(customer.id),
        details=f"Approved customer {customer.name} ({customer.phone})",
    )
    db.commit()
    return {"message": "Customer approved"}


@router.patch("/{customer_id}/reject")
def reject_customer(customer_id: int, db: Session = Depends(get_db), current_admin=Depends(require_admin)):
    customer = db.get(User, customer_id)
    if not customer or customer.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    customer.status = UserStatus.REJECTED
    create_audit_log(
        db=db,
        actor_user_id=current_admin.id,
        action="CUSTOMER_REJECTED",
        entity_type="USER",
        entity_id=str(customer.id),
        details=f"Rejected customer {customer.name} ({customer.phone})",
    )
    db.commit()
    return {"message": "Customer rejected. They can re-apply later."}
