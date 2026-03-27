from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin_audit,
    admin_analytics,
    admin_billing,
    admin_customers,
    admin_exports,
    admin_milk_entries,
    admin_payments,
    admin_summary,
    auth,
    customer_bills,
    customer_exports,
    customer_logs,
    customer_payments,
    pdf_bills,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(admin_customers.router)
api_router.include_router(admin_milk_entries.router)
api_router.include_router(admin_billing.router)
api_router.include_router(admin_payments.router)
api_router.include_router(admin_audit.router)
api_router.include_router(admin_analytics.router)
api_router.include_router(admin_exports.router)
api_router.include_router(admin_summary.router)
api_router.include_router(customer_logs.router)
api_router.include_router(customer_bills.router)
api_router.include_router(customer_exports.router)
api_router.include_router(customer_payments.router)
api_router.include_router(pdf_bills.router)
