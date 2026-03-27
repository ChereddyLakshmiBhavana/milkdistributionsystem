"""add month lock fields

Revision ID: 0003_add_month_lock_fields
Revises: 0002_add_audit_logs
Create Date: 2026-03-27 12:15:00

"""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_month_lock_fields"
down_revision = "0002_add_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("monthly_bills", sa.Column("is_locked", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("monthly_bills", sa.Column("locked_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("monthly_bills", "locked_at")
    op.drop_column("monthly_bills", "is_locked")
