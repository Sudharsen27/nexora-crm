"""add deal closed_at for dashboard revenue analytics

Revision ID: 007
Revises: 006
Create Date: 2026-06-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "deals",
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE deals SET closed_at = updated_at "
            "WHERE stage IN ('won', 'lost') AND closed_at IS NULL"
        )
    )
    op.create_index(
        "ix_deals_tenant_won_closed_at",
        "deals",
        ["tenant_id", "closed_at"],
        postgresql_where=sa.text("stage = 'won'"),
    )
    op.create_index(
        "ix_deals_tenant_stage_closed_at",
        "deals",
        ["tenant_id", "stage", "closed_at"],
        postgresql_where=sa.text("stage IN ('won', 'lost')"),
    )


def downgrade() -> None:
    op.drop_index("ix_deals_tenant_stage_closed_at", table_name="deals")
    op.drop_index("ix_deals_tenant_won_closed_at", table_name="deals")
    op.drop_column("deals", "closed_at")
