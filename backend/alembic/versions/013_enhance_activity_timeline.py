"""enhance activities for enterprise timeline

Revision ID: 013
Revises: 012
Create Date: 2026-06-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("activities", sa.Column("action", sa.String(length=50), nullable=True))
    op.add_column("activities", sa.Column("title", sa.String(length=255), nullable=True))
    op.add_column("activities", sa.Column("icon", sa.String(length=50), nullable=True))
    op.add_column("activities", sa.Column("color", sa.String(length=30), nullable=True))
    op.add_column(
        "activities",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(
        """
        UPDATE activities SET
            action = activity_type,
            title = LEFT(description, 255),
            icon = 'activity',
            color = 'zinc'
        WHERE action IS NULL
        """
    )

    op.alter_column("activities", "action", nullable=False)
    op.alter_column("activities", "title", nullable=False)

    op.create_index("ix_activities_tenant_action", "activities", ["tenant_id", "action"])
    op.create_index("ix_activities_tenant_actor", "activities", ["tenant_id", "created_by_id"])
    op.create_index(
        "ix_activities_tenant_archived",
        "activities",
        ["tenant_id", "archived_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_activities_tenant_archived", table_name="activities")
    op.drop_index("ix_activities_tenant_actor", table_name="activities")
    op.drop_index("ix_activities_tenant_action", table_name="activities")
    op.drop_column("activities", "archived_at")
    op.drop_column("activities", "color")
    op.drop_column("activities", "icon")
    op.drop_column("activities", "title")
    op.drop_column("activities", "action")
