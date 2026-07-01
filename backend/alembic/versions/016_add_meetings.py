"""Add meetings, participants, and reminders tables.

Revision ID: 016
Revises: 015
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "meetings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("agenda", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("meeting_type", sa.String(50), nullable=False, server_default="client_meeting"),
        sa.Column("status", sa.String(30), nullable=False, server_default="scheduled"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("location", sa.String(500), nullable=True),
        sa.Column("meeting_url", sa.String(500), nullable=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deals.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("organizer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recurrence_rule", postgresql.JSONB(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("activity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("activities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_meetings_tenant_id", "meetings", ["tenant_id"])
    op.create_index("ix_meetings_tenant_start", "meetings", ["tenant_id", "start_datetime"])
    op.create_index("ix_meetings_tenant_status", "meetings", ["tenant_id", "status"])
    op.create_index("ix_meetings_tenant_type", "meetings", ["tenant_id", "meeting_type"])
    op.create_index("ix_meetings_tenant_company", "meetings", ["tenant_id", "company_id"])
    op.create_index("ix_meetings_tenant_contact", "meetings", ["tenant_id", "contact_id"])
    op.create_index("ix_meetings_tenant_lead", "meetings", ["tenant_id", "lead_id"])
    op.create_index("ix_meetings_tenant_deal", "meetings", ["tenant_id", "deal_id"])
    op.create_index("ix_meetings_tenant_organizer", "meetings", ["tenant_id", "organizer_id"])

    op.create_table(
        "meeting_participants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(30), nullable=False, server_default="attendee"),
        sa.Column("attendance_status", sa.String(30), nullable=False, server_default="invited"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_meeting_participants_meeting", "meeting_participants", ["meeting_id"])
    op.create_index("ix_meeting_participants_user", "meeting_participants", ["user_id"])

    op.create_table(
        "meeting_reminders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("remind_before_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("method", sa.String(20), nullable=False, server_default="in_app"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_meeting_reminders_meeting", "meeting_reminders", ["meeting_id"])


def downgrade() -> None:
    op.drop_table("meeting_reminders")
    op.drop_table("meeting_participants")
    op.drop_table("meetings")
