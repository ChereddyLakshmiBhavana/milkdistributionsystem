from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Response, status
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models import MonthlyBill, User, UserRole

router = APIRouter(prefix="/bills", tags=["pdf-bills"])


@router.get("/{bill_id}/pdf")
def download_bill_pdf(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = db.get(MonthlyBill, bill_id)
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    if current_user.role == UserRole.CUSTOMER and bill.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own bill")

    if current_user.role == UserRole.ADMIN:
        require_admin(current_user)

    customer = db.get(User, bill.customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.setTitle(f"bill-{bill.id}")

    y = 800
    pdf.drawString(50, y, "Milk Distribution Monthly Bill")
    y -= 30
    pdf.drawString(50, y, f"Customer: {customer.name}")
    y -= 20
    pdf.drawString(50, y, f"Phone: {customer.phone}")
    y -= 20
    pdf.drawString(50, y, f"Billing Month: {bill.month_start} to {bill.month_end}")
    y -= 30
    pdf.drawString(50, y, f"Monthly Milk Amount: Rs {bill.total_amount}")
    y -= 20
    pdf.drawString(50, y, f"Previous Due: Rs {bill.previous_due}")
    y -= 20
    pdf.drawString(50, y, f"Total Payable: Rs {bill.payable_amount}")
    y -= 20
    pdf.drawString(50, y, f"Paid Amount: Rs {bill.paid_amount}")
    y -= 20
    pdf.drawString(50, y, f"Pending Due: Rs {bill.unpaid_amount}")
    y -= 20
    pdf.drawString(50, y, f"Status: {bill.status.value}")

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return Response(
        content=buffer.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=bill_{bill.id}.pdf"},
    )
