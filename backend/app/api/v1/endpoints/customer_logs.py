from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_approved_customer
from app.db.session import get_db
from app.models import MilkEntry, User
from app.schemas.milk_entry import MilkEntryOut

router = APIRouter(prefix="/customer/logs", tags=["customer-logs"])


@router.get("/me", response_model=list[MilkEntryOut])
def my_logs(year: int, month: int, db: Session = Depends(get_db), current_user: User = Depends(require_approved_customer)):
    last_day = monthrange(year, month)[1]
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    entries = db.scalars(
        select(MilkEntry)
        .where(MilkEntry.customer_id == current_user.id, MilkEntry.entry_date >= start_date, MilkEntry.entry_date <= end_date)
        .order_by(MilkEntry.entry_date)
    )
    return list(entries)
