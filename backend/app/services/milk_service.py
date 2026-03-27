from decimal import Decimal

from fastapi import HTTPException, status

from app.core.constants import ALLOWED_QUANTITIES, PRICE_HALF_LITER, PRICE_PER_LITER, PRICE_THREE_QUARTER_LITER


def calculate_amount(quantity_liters: Decimal) -> Decimal:
    if quantity_liters not in ALLOWED_QUANTITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quantity must be one of 0.50, 0.75, 1.00 liters",
        )

    if quantity_liters == Decimal("0.50"):
        return PRICE_HALF_LITER
    if quantity_liters == Decimal("0.75"):
        return PRICE_THREE_QUARTER_LITER
    return PRICE_PER_LITER
