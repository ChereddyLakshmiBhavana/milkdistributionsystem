"""init schema

Revision ID: 0001_init_schema
Revises:
Create Date: 2026-03-27 09:00:00

"""

from alembic import op
import sqlalchemy as sa


revision = "0001_init_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("ADMIN", "CUSTOMER", name="userrole"), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "APPROVED", "REJECTED", name="userstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    op.create_table(
        "milk_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("quantity_liters", sa.Numeric(4, 2), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_milk_entries_id", "milk_entries", ["id"], unique=False)
    op.create_index("ix_milk_entries_customer_id", "milk_entries", ["customer_id"], unique=False)
    op.create_index("ix_milk_entries_entry_date", "milk_entries", ["entry_date"], unique=False)

    op.create_table(
        "monthly_bills",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("month_start", sa.Date(), nullable=False),
        sa.Column("month_end", sa.Date(), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("previous_due", sa.Numeric(10, 2), nullable=False),
        sa.Column("payable_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("paid_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("unpaid_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.Enum("PAID", "UNPAID", name="billstatus"), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("customer_id", "month_start", name="uq_customer_month"),
    )
    op.create_index("ix_monthly_bills_id", "monthly_bills", ["id"], unique=False)
    op.create_index("ix_monthly_bills_customer_id", "monthly_bills", ["customer_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("bill_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("paid_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["bill_id"], ["monthly_bills.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_payments_id", "payments", ["id"], unique=False)
    op.create_index("ix_payments_bill_id", "payments", ["bill_id"], unique=False)
    op.create_index("ix_payments_customer_id", "payments", ["customer_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_payments_customer_id", table_name="payments")
    op.drop_index("ix_payments_bill_id", table_name="payments")
    op.drop_index("ix_payments_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("ix_monthly_bills_customer_id", table_name="monthly_bills")
    op.drop_index("ix_monthly_bills_id", table_name="monthly_bills")
    op.drop_table("monthly_bills")

    op.drop_index("ix_milk_entries_entry_date", table_name="milk_entries")
    op.drop_index("ix_milk_entries_customer_id", table_name="milk_entries")
    op.drop_index("ix_milk_entries_id", table_name="milk_entries")
    op.drop_table("milk_entries")

    op.drop_index("ix_users_phone", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
