"""add activity scheduled_at for dashboard calendar

Revision ID: 008
Revises: 007
Create Date: 2026-06-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "activities",
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_activities_tenant_scheduled_at",
        "activities",
        ["tenant_id", "scheduled_at"],
        postgresql_where=sa.text("scheduled_at IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_activities_tenant_scheduled_at", table_name="activities")
    op.drop_column("activities", "scheduled_at")
