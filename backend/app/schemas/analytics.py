from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class MonthlyAnalyticsPoint(BaseModel):
    month_start: date
    paid_amount: Decimal
    unpaid_amount: Decimal
    payable_amount: Decimal


class MonthlyAnalyticsOut(BaseModel):
    months: list[MonthlyAnalyticsPoint]
