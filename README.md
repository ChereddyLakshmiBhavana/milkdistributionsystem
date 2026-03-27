# Milk Distribution Billing & Management System

A full-stack application for managing milk distribution, customer billing, month-based locking, audit trails, and comprehensive reporting. Built with FastAPI, React, and SQLAlchemy.

**Repository:** [ChereddyLakshmiBhavana/milkdistributionsystem](https://github.com/ChereddyLakshmiBhavana/milkdistributionsystem)

---

## Quick Start (Localhost)

### Frontend
```bash
cd frontend
npm install
npm run dev
```
**Access:** http://localhost:5173

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
**Access:** http://localhost:8000  
**API Docs:** http://localhost:8000/docs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7, React Router, Axios, Vitest |
| **Backend** | FastAPI 0.135, SQLAlchemy 2.0, Alembic 1.18 |
| **Database** | SQLite (dev), MySQL (production) |
| **Auth** | JWT (phone + password) |
| **Reports** | ReportLab (PDF), CSV export |
| **Testing** | Pytest (backend), Vitest (frontend) |
| **CI/CD** | GitHub Actions |

---

## Core Features

### Admin Controls
- ✅ **Billing Management** - Sort by newest/oldest/unpaid-first with active filter chips
- ✅ **Month Locking** - Lock/unlock bills with audit reason capture
- ✅ **Audit Trail** - Complete activity log with filtering (action, actor, date range)
- ✅ **Customer Approvals** - Signup request review workflow
- ✅ **Milk Entry Management** - Add/edit/delete daily entries
- ✅ **Health Checks** - Deep API + database status validation

### Customer Features
- ✅ View personal bills and milk records
- ✅ Download CSV exports of own data
- ✅ Monthly billing information

### System Features
- ✅ **Billing Cycle** - Calendar month, no partial payments
- ✅ **Pricing** - Configurable by volume (0.5L=43, 0.75L=65, 1L=86)
- ✅ **Multi-language** - English & Telugu UI toggle
- ✅ **CSV/PDF Export** - Monthly summaries and bills
- ✅ **Role-based Access** - ADMIN and CUSTOMER roles
- ✅ **Statistics Dashboard** - Monthly summary cards, trend analytics

---

## Testing

### Backend (10 Tests)
```bash
cd backend
python -m pytest -q
```

**Covers:**
- Health endpoint (API + DB validation)
- Month lock/unlock workflow with audit
- Billing filters (locked, unpaid, combined)
- Audit log filtering with date ranges
- Unlock without reason handling

**Files:** `backend/tests/test_*.py`

### Frontend (5 Tests)
```bash
cd frontend
npm install
npm run test
```

**Covers:**
- Bill sorting interaction (newest/oldest/unpaid)
- Removable locked chip behavior
- Sort chip reset on removal
- API parameter mapping (camelCase to snake_case)
- Audit filter parameter mapping

**Files:** `frontend/src/**/*.test.js(x)`

### CI/CD Automation
GitHub Actions runs all tests automatically on push/PR:
- `.github/workflows/ci.yml` - Backend tests + Frontend tests + Build

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, routes, health endpoint
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── database.py          # Database connection
│   │   └── routes/              # API endpoints
│   ├── tests/                   # Pytest test files
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/admin/         # Admin UI pages (Billing, Entries, Audit)
│   │   ├── api/                 # API client (adminApi.js)
│   │   ├── test/                # Test setup
│   │   └── i18n.js              # English/Telugu translations
│   ├── vite.config.js           # Vite config with Vitest setup
│   ├── package.json
│   └── src/**/*.test.jsx         # Component tests
├── .github/workflows/
│   └── ci.yml                   # GitHub Actions CI pipeline
└── README.md
```

---

## Default Admin Account

The system auto-seeds a default admin account:
- **Email:** admin@example.com
- **Password:** admin123
- **Role:** ADMIN

---

## Database Setup

### Run Migrations (Recommended)
```bash
cd backend
alembic upgrade head
```

### Database Files
- Development: SQLite (auto-created in backend/)
- Production: Configure MySQL via `.env`

### Environment Variables
Copy `.env.example` to `.env` and configure:
```env
DATABASE_URL=sqlite:///./milk_distribution.db
JWT_SECRET_KEY=your-secret-key
```

---

## API Endpoints Overview

### Authentication
- `POST /api/v1/auth/signup` - Customer signup
- `POST /api/v1/auth/login` - Login (returns JWT)

### Admin Operations
- `GET /api/v1/admin/customers` - List customers
- `PATCH /api/v1/admin/customers/{id}/approve` - Approve signup
- `POST /api/v1/admin/bills/generate/{customer_id}` - Generate monthly bill
- `GET /api/v1/admin/bills` - List bills with filters (onlyLocked, onlyUnpaid)
- `PATCH /api/v1/admin/bills/{id}/lock` - Lock bill month
- `PATCH /api/v1/admin/bills/{id}/unlock` - Unlock with reason
- `GET /api/v1/admin/audit` - Audit log with filtering
- `GET /health` - Health check (200 if healthy, 503 if DB unavailable)

### Customer Operations
- `GET /api/v1/customer/bills` - View own bills
- `GET /api/v1/customer/entries` - View own entries

**Full API Documentation:** http://localhost:8000/docs (when running)

---

## Deployment

### Environment Checklist
- [ ] Set `ENV=production` in `.env`
- [ ] Configure `DATABASE_URL` for MySQL
- [ ] Set strong `JWT_SECRET_KEY`
- [ ] Update CORS origins
- [ ] Enable HTTPS

### Docker (Optional)
Create `Dockerfile` for backend and `Dockerfile` for frontend to containerize deployment.

---

## Development Scripts

### Backend
```bash
cd backend
python -m uvicorn app.main:app --reload  # Development server
python -m pytest -q                       # Run tests
python -m alembic revision --autogenerate -m "message"  # Create migration
```

### Frontend
```bash
cd frontend
npm run dev     # Development server
npm run build   # Production build
npm run test    # Run tests
npm run preview # Preview build
```

---

## Key Implementation Highlights

### Sorting & Filtering (Frontend)
- Client-side sorting with useMemo for performance
- Server-side filter parameters (onlyLocked, onlyUnpaid)
- Active filter chips with one-click removal
- Visual feedback for active/inactive filter states

### Month Locking Workflow (Backend)
- Lock bill month to prevent further edits
- Unlock with reason capture (audit trail)
- Audit log entry for all lock/unlock operations
- Deep health check validates API + DB connectivity

### Testing Strategy
- Isolated test fixtures (in-memory SQLite for backend)
- Component tests with @testing-library/react
- API integration tests verifying parameter mapping
- CI/CD runs full suite on every push

---

## Known Limitations

- No support for partial month billing adjustments
- No advance payment feature
- Bill status limited to PAID/UNPAID (no refunds)
- Single admin approval workflow (no multi-level approvals)

---

## Future Enhancements

- [ ] Mobile app (React Native)
- [ ] SMS notifications for billing
- [ ] Bulk customer import
- [ ] Custom pricing plans per customer
- [ ] Advance payments and refund support
- [ ] Multi-admin approval workflows
- [ ] Real-time notifications via WebSocket

---

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Ensure all tests pass: `npm run test` (frontend), `pytest -q` (backend)
4. Push to GitHub
5. CI will auto-run on PR; all checks must pass before merge

---

## License

MIT License - Feel free to use and modify.

---

## Support

For issues or questions, open a GitHub issue on the repository.
