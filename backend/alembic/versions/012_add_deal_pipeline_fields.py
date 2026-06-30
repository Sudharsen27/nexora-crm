"""add deal contact_id and probability for pipeline

Revision ID: 012
Revises: 011
Create Date: 2026-06-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "deals",
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "deals",
        sa.Column("probability", sa.Integer(), nullable=False, server_default="10"),
    )
    op.create_foreign_key(
        "fk_deals_contact_id",
        "deals",
        "contacts",
        ["contact_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_deals_tenant_contact", "deals", ["tenant_id", "contact_id"])

    # Backfill probability from stage defaults
    op.execute(
        """
        UPDATE deals SET probability = CASE stage
            WHEN 'new' THEN 10
            WHEN 'qualified' THEN 25
            WHEN 'proposal' THEN 50
            WHEN 'negotiation' THEN 75
            WHEN 'won' THEN 100
            WHEN 'lost' THEN 0
            ELSE 10
        END
        """
    )


def downgrade() -> None:
    op.drop_index("ix_deals_tenant_contact", table_name="deals")
    op.drop_constraint("fk_deals_contact_id", "deals", type_="foreignkey")
    op.drop_column("deals", "probability")
    op.drop_column("deals", "contact_id")
