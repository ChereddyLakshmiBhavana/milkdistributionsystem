# API Contract (v1)

Base URL: /api/v1

## Health
- GET /health

Response behavior:
- 200 with status=ok when API and database checks pass
- 503 with status=degraded when database is unavailable

## Auth
- POST /auth/signup
- POST /auth/login

## Admin customers
- GET /admin/customers
- GET /admin/customers/pending
- PATCH /admin/customers/{customer_id}/approve
- PATCH /admin/customers/{customer_id}/reject

## Admin dashboard
- GET /admin/summary?year=&month=

## Admin analytics
- GET /admin/analytics/monthly-collections?year=&month=&months_back=

## Admin exports
- GET /admin/exports/monthly-entries.csv?year=&month=
- GET /admin/exports/daily-logs.pdf?customer_id=&year=&month=
- GET /admin/exports/monthly-bills.csv?year=&month=
- GET /admin/exports/audit-logs.csv?action=&entity_type=&q=&actor_user_id=&start_date=&end_date=

## Admin audit
- GET /admin/audit-logs?limit=&offset=

Optional admin audit filters:
- action
- entity_type
- q (free-text over details/action/entity_id)
- actor_user_id
- start_date (YYYY-MM-DD)
- end_date (YYYY-MM-DD)

## Admin milk entries
- POST /admin/milk-entries
- GET /admin/milk-entries?customer_id=&start_date=&end_date=
- PATCH /admin/milk-entries/{entry_id}
- DELETE /admin/milk-entries/{entry_id}

## Admin billing
- POST /admin/bills/generate/{customer_id}?year=&month=
- GET /admin/bills/customer/{customer_id}?only_locked=&only_unpaid=
- POST /admin/bills/{bill_id}/lock
- POST /admin/bills/{bill_id}/unlock

## Admin payments
- POST /admin/payments
- GET /admin/payments/bill/{bill_id}

## Customer view
- GET /customer/logs/me?year=&month=
- GET /customer/bills/me
- GET /customer/payments/me

## Customer exports
- GET /customer/exports/my-logs.csv?year=&month=
- GET /customer/exports/my-bills.csv?year=&month=

## PDF
- GET /bills/{bill_id}/pdf
