from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import Date, DateTime, Enum as SqlEnum, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class BillStatus(str, Enum):
    PAID = "PAID"
    UNPAID = "UNPAID"


class MonthlyBill(Base):
    __tablename__ = "monthly_bills"
    __table_args__ = (UniqueConstraint("customer_id", "month_start", name="uq_customer_month"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month_start: Mapped[date] = mapped_column(Date, nullable=False)
    month_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    previous_due: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payable_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    unpaid_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[BillStatus] = mapped_column(SqlEnum(BillStatus), nullable=False, default=BillStatus.UNPAID)
    is_locked: Mapped[bool] = mapped_column(default=False, nullable=False)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("User", back_populates="bills")
    payments = relationship("Payment", back_populates="bill", cascade="all, delete-orphan")
