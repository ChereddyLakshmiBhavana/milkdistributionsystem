# Smart Milk Distribution & Billing Management System

## Tech stack
- Backend: FastAPI + SQLAlchemy + MySQL
- Frontend: React + Vite
- Auth: JWT (phone + password)
- PDF: ReportLab

## Confirmed business rules
- Admin can add/edit/delete entries
- Customer is view-only
- Customer signup requires admin approval
- Pricing: 0.5L=43, 0.75L=65, 1L=86
- Billing cycle: calendar month
- No partial payment, no advance payment
- Bill status: PAID / UNPAID
- English and Telugu UI toggle
- Admin dashboard monthly summary cards
- Admin analytics trend (monthly collections)
- CSV exports for monthly entries and monthly bills
- Admin audit trail for key write actions
- Modular admin routes for overview/approvals/entries/billing/audit
- Admin audit filtering (action/actor/date)
- Customer-side CSV exports for own logs and bills
- Admin month finalization lock/unlock per generated bill

## Project layout
- `backend/` API and database logic
- `frontend/` web app UI

## Run backend
1. `cd backend`
2. `python -m venv .venv`
3. `.venv\Scripts\activate`
4. `pip install -r requirements.txt`
5. copy `.env.example` to `.env`
6. `uvicorn app.main:app --reload`

## Run migrations (recommended)
1. `cd backend`
2. `alembic upgrade head`

## Run frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

Default admin account is auto-seeded from your requirements.
