from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class MonthlyBillOut(BaseModel):
    id: int
    customer_id: int
    month_start: date
    month_end: date
    total_amount: Decimal
    previous_due: Decimal
    payable_amount: Decimal
    paid_amount: Decimal
    unpaid_amount: Decimal
    status: str
    is_locked: bool
    locked_at: datetime | None
    generated_at: datetime

    class Config:
        from_attributes = True


class MonthUnlockRequest(BaseModel):
    reason: str | None = None
