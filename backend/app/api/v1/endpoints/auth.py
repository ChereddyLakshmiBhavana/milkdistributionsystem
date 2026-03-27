from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models import User, UserRole, UserStatus
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def customer_signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.phone == payload.phone))
    if existing:
        if existing.status == UserStatus.REJECTED:
            existing.name = payload.name
            existing.address = payload.address
            existing.password_hash = get_password_hash(payload.password)
            existing.status = UserStatus.PENDING
            db.commit()
            return {"message": "Re-application submitted and pending admin approval"}
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone already registered")

    user = User(
        name=payload.name,
        phone=payload.phone,
        address=payload.address,
        password_hash=get_password_hash(payload.password),
        role=UserRole.CUSTOMER,
        status=UserStatus.PENDING,
    )
    db.add(user)
    db.commit()
    return {"message": "Signup successful. Waiting for admin approval"}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.phone == payload.phone))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password")

    if user.role == UserRole.CUSTOMER and user.status != UserStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer is not approved by admin")

    token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )

    return TokenResponse(access_token=token, role=user.role.value, status=user.status.value)
