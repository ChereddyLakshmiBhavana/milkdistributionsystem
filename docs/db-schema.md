# Database Schema

## users
- id (PK)
- name
- phone (unique)
- address
- password_hash
- role: ADMIN | CUSTOMER
- status: PENDING | APPROVED | REJECTED
- created_at

## milk_entries
- id (PK)
- customer_id (FK -> users.id)
- entry_date
- quantity_liters (0.50, 0.75, 1.00)
- amount
- created_at

## monthly_bills
- id (PK)
- customer_id (FK -> users.id)
- month_start
- month_end
- total_amount
- previous_due
- payable_amount
- paid_amount
- unpaid_amount
- status: PAID | UNPAID
- generated_at
- unique(customer_id, month_start)

## payments
- id (PK)
- customer_id (FK -> users.id)
- bill_id (FK -> monthly_bills.id)
- amount
- paid_at
