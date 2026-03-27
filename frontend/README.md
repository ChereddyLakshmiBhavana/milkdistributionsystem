# Frontend (React + Vite)

## Quick start
1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Run frontend unit tests:
   - `npm run test`

## Environment
Copy `.env.example` to `.env` and set:
- `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`

## Current starter scope
- Login page (phone + password)
- Customer signup page (admin approval flow)
- Protected role-based routes
- Admin dashboard with pending approvals, milk entry CRUD, bill generation, full-payment action
- Customer dashboard with day-wise logs, bills, payment history, and PDF download
- English/Telugu language toggle in navbar
- Admin summary cards for monthly overview
- Admin monthly trend visualization (collections)
- CSV export buttons for monthly entries and monthly bills
- Recent admin activity panel (audit trail)
- Audit filters by action, actor id, and date range
- Customer CSV exports for own monthly logs and bills
- Month lock/unlock control in admin billing page
- Audit pagination with server-side offset/limit
- Quick billing filters (locked-only, unpaid-only)
- Server-side audit search/filter by action/entity/search text/actor/date
- Unlock reason input in billing page for audit traceability

## Admin page structure
- `/admin` Overview (summary, trend, exports)
- `/admin/approvals` Pending customer approvals
- `/admin/entries` Daily milk entry management
- `/admin/billing` Bill generation and full payment updates
- `/admin/audit` Recent admin activity logs
