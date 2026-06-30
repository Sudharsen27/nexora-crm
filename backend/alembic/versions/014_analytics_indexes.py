"""Analytics query indexes for dashboard performance.

Revision ID: 014
Revises: 013
"""

from typing import Sequence, Union

from alembic import op

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_leads_tenant_status_created", "leads", ["tenant_id", "status", "created_at"])
    op.create_index("ix_activities_tenant_created", "activities", ["tenant_id", "created_at"])
    op.create_index("ix_deals_tenant_assigned_stage", "deals", ["tenant_id", "assigned_to_id", "stage"])
    op.create_index("ix_tasks_tenant_status_updated", "tasks", ["tenant_id", "status", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_tasks_tenant_status_updated", table_name="tasks")
    op.drop_index("ix_deals_tenant_assigned_stage", table_name="deals")
    op.drop_index("ix_activities_tenant_created", table_name="activities")
    op.drop_index("ix_leads_tenant_status_created", table_name="leads")
