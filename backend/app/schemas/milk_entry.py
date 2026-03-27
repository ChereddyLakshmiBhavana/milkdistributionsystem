from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class MilkEntryCreate(BaseModel):
    customer_id: int
    entry_date: date
    quantity_liters: Decimal = Field(description="Allowed values: 0.50, 0.75, 1.00")


class MilkEntryUpdate(BaseModel):
    quantity_liters: Decimal = Field(description="Allowed values: 0.50, 0.75, 1.00")


class MilkEntryOut(BaseModel):
    id: int
    customer_id: int
    entry_date: date
    quantity_liters: Decimal
    amount: Decimal
    created_at: datetime

    class Config:
        from_attributes = True
