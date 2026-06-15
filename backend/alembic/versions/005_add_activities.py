"""add activities table

Revision ID: 005
Revises: 004
Create Date: 2026-06-15
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=30), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activity_type", sa.String(length=30), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activities_tenant_id", "activities", ["tenant_id"])
    op.create_index("ix_activities_tenant_created_at", "activities", ["tenant_id", "created_at"])
    op.create_index("ix_activities_tenant_entity", "activities", ["tenant_id", "entity_type", "entity_id"])
    op.create_index("ix_activities_tenant_type", "activities", ["tenant_id", "activity_type"])


def downgrade() -> None:
    op.drop_index("ix_activities_tenant_type", table_name="activities")
    op.drop_index("ix_activities_tenant_entity", table_name="activities")
    op.drop_index("ix_activities_tenant_created_at", table_name="activities")
    op.drop_index("ix_activities_tenant_id", table_name="activities")
    op.drop_table("activities")
