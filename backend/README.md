# Backend (FastAPI)

## Features implemented in this starter
- Phone + password login
- Customer signup with admin approval
- Admin-only create/edit/delete milk entries
- Customer view-only logs and bills
- Fixed milk pricing (0.5L=43, 0.75L=65, 1L=86)
- Calendar month billing
- Full payment only (no partial, no advance)
- Paid/Unpaid bill status
- PDF download for monthly bill
- Default admin seed account

## Quick start
1. Create virtual env and install dependencies:
   - `python -m venv .venv`
   - `.venv\Scripts\activate`
   - `pip install -r requirements.txt`
2. Copy `.env.example` to `.env` and update database URL.
3. Run server:
   - `uvicorn app.main:app --reload`
4. Open docs:
   - `http://127.0.0.1:8000/docs`

## Default admin account
- Phone: `9701984413`
- Password: `Bhavana@2006`

## Notes
- Tables are auto-created on startup for this starter version.
- For production, use Alembic migrations.

## Alembic migrations
1. Install dependencies:
   - `pip install -r requirements.txt`
2. Generate migration (if models change):
   - `alembic revision --autogenerate -m "update schema"`
3. Apply migrations:
   - `alembic upgrade head`

## Run tests
1. Install dependencies:
   - `pip install -r requirements.txt`
2. Run tests:
   - `pytest -q`
