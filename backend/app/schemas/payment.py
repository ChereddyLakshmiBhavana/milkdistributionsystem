from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    bill_id: int
    amount: Decimal = Field(gt=0)


class PaymentOut(BaseModel):
    id: int
    customer_id: int
    bill_id: int
    amount: Decimal
    paid_at: datetime

    class Config:
        from_attributes = True
