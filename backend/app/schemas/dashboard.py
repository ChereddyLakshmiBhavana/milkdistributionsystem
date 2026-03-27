from decimal import Decimal

from pydantic import BaseModel


class AdminSummaryOut(BaseModel):
    total_customers: int
    pending_approvals: int
    daily_total_liters: Decimal
    monthly_income: Decimal
    pending_dues_total: Decimal
