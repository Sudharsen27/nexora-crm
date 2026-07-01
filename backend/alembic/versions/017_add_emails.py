"""Add enterprise email center tables.

Revision ID: 017
Revises: 016
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_threads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_threads_tenant_id", "email_threads", ["tenant_id"])
    op.create_index("ix_email_threads_tenant_last", "email_threads", ["tenant_id", "last_message_at"])

    op.create_table(
        "email_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="sales"),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("variables", postgresql.JSONB(), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_templates_tenant_id", "email_templates", ["tenant_id"])
    op.create_index("ix_email_templates_tenant_category", "email_templates", ["tenant_id", "category"])

    op.create_table(
        "email_user_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("signature_html", sa.Text(), nullable=True),
        sa.Column("signature_text", sa.Text(), nullable=True),
        sa.Column("default_from_name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "user_id", name="uq_email_user_settings_tenant_user"),
    )

    op.create_table(
        "emails",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("email_threads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("parent_email_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("emails.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("from_email", sa.String(320), nullable=True),
        sa.Column("from_name", sa.String(255), nullable=True),
        sa.Column("subject", sa.String(500), nullable=False, server_default=""),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="normal"),
        sa.Column("folder", sa.String(30), nullable=False, server_default="drafts"),
        sa.Column("direction", sa.String(20), nullable=False, server_default="outbound"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_starred", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_important", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("has_attachments", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("tracking_token", sa.String(64), nullable=True, unique=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deals.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True),
        sa.Column("activity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("activities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_emails_tenant_id", "emails", ["tenant_id"])
    op.create_index("ix_emails_tenant_folder", "emails", ["tenant_id", "folder"])
    op.create_index("ix_emails_tenant_status", "emails", ["tenant_id", "status"])
    op.create_index("ix_emails_tenant_sender", "emails", ["tenant_id", "sender_id"])
    op.create_index("ix_emails_tenant_thread", "emails", ["tenant_id", "thread_id"])
    op.create_index("ix_emails_tenant_scheduled", "emails", ["tenant_id", "scheduled_at"])
    op.create_index("ix_emails_tenant_contact", "emails", ["tenant_id", "contact_id"])
    op.create_index("ix_emails_tenant_deal", "emails", ["tenant_id", "deal_id"])
    op.create_index("ix_emails_tenant_lead", "emails", ["tenant_id", "lead_id"])
    op.create_index("ix_emails_tenant_company", "emails", ["tenant_id", "company_id"])
    op.create_index("ix_emails_tracking_token", "emails", ["tracking_token"], unique=True)

    op.create_table(
        "email_recipients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("emails.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_type", sa.String(10), nullable=False),
        sa.Column("email_address", sa.String(320), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_recipients_email", "email_recipients", ["email_id"])
    op.create_index("ix_email_recipients_address", "email_recipients", ["email_address"])

    op.create_table(
        "email_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("emails.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_attachments_email", "email_attachments", ["email_id"])

    op.create_table(
        "email_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("emails.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_logs_email", "email_logs", ["email_id"])
    op.create_index("ix_email_logs_event", "email_logs", ["email_id", "event_type"])


def downgrade() -> None:
    op.drop_table("email_logs")
    op.drop_table("email_attachments")
    op.drop_table("email_recipients")
    op.drop_table("emails")
    op.drop_table("email_user_settings")
    op.drop_table("email_templates")
    op.drop_table("email_threads")
