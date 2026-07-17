"""Add Enterprise Customer Support & Service Desk (Phase 19).

Revision ID: 028
Revises: 027
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "028"
down_revision: Union[str, None] = "027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ticket_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.String(30), nullable=False, server_default="slate"),
        sa.Column("icon", sa.String(50), nullable=False, server_default="folder"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_ticket_categories_tenant_slug"),
    )
    op.create_index("ix_ticket_categories_tenant", "ticket_categories", ["tenant_id"])

    op.create_table(
        "sla_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("channel", sa.String(30), nullable=True),
        sa.Column("response_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("resolution_minutes", sa.Integer(), nullable=False, server_default="480"),
        sa.Column("escalation_minutes", sa.Integer(), nullable=False, server_default="240"),
        sa.Column("escalate_to_level", sa.String(30), nullable=False, server_default="level_2"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "name", name="uq_sla_policies_tenant_name"),
    )
    op.create_index("ix_sla_policies_tenant", "sla_policies", ["tenant_id"])
    op.create_index("ix_sla_policies_tenant_active", "sla_policies", ["tenant_id", "is_active"])

    op.create_table(
        "knowledge_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("icon", sa.String(50), nullable=False, server_default="book"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_knowledge_categories_tenant_slug"),
    )
    op.create_index("ix_knowledge_categories_tenant", "knowledge_categories", ["tenant_id"])

    # Alter support_tickets for enterprise fields
    op.alter_column("support_tickets", "portal_user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for fk in inspector.get_foreign_keys("support_tickets"):
        if fk.get("constrained_columns") == ["portal_user_id"]:
            op.drop_constraint(fk["name"], "support_tickets", type_="foreignkey")
            break
    op.create_foreign_key(
        "support_tickets_portal_user_id_fkey",
        "support_tickets",
        "customer_portal_users",
        ["portal_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("support_tickets", sa.Column("ticket_number", sa.String(30), nullable=True))
    op.add_column("support_tickets", sa.Column("channel", sa.String(30), nullable=False, server_default="portal"))
    op.add_column("support_tickets", sa.Column("source", sa.String(30), nullable=False, server_default="portal"))
    op.add_column("support_tickets", sa.Column("escalation_level", sa.String(30), nullable=False, server_default="level_1"))
    op.add_column("support_tickets", sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("support_tickets", sa.Column("sla_policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sla_policies.id", ondelete="SET NULL"), nullable=True))
    op.add_column("support_tickets", sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ticket_categories.id", ondelete="SET NULL"), nullable=True))
    op.add_column("support_tickets", sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("support_tickets", sa.Column("response_due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("support_tickets", sa.Column("resolution_due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("support_tickets", sa.Column("escalation_due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("support_tickets", sa.Column("sla_breached", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("support_tickets", sa.Column("sentiment", sa.String(30), nullable=True))
    op.add_column("support_tickets", sa.Column("tags", postgresql.JSONB(), nullable=False, server_default="[]"))
    op.add_column("support_tickets", sa.Column("merged_into_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True))
    op.add_column("support_tickets", sa.Column("parent_ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True))
    op.add_column("support_tickets", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("support_tickets", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("support_tickets", sa.Column("last_customer_reply_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("support_tickets", sa.Column("last_agent_reply_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("support_tickets", sa.Column("csat_score", sa.Integer(), nullable=True))
    op.add_column("support_tickets", sa.Column("extra_data", postgresql.JSONB(), nullable=False, server_default="{}"))

    op.execute("UPDATE support_tickets SET status = 'new' WHERE status = 'open'")
    op.create_index("ix_support_tickets_assignee", "support_tickets", ["tenant_id", "assigned_to_id"])
    op.create_index("ix_support_tickets_priority", "support_tickets", ["tenant_id", "priority"])
    op.create_index("ix_support_tickets_channel", "support_tickets", ["tenant_id", "channel"])
    op.create_index("ix_support_tickets_number", "support_tickets", ["tenant_id", "ticket_number"])
    op.create_index("ix_support_tickets_sla", "support_tickets", ["tenant_id", "sla_breached"])
    op.create_index("ix_support_tickets_archived", "support_tickets", ["tenant_id", "is_archived"])

    op.add_column("ticket_replies", sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("ticket_replies", sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default="false"))

    op.add_column("knowledge_articles", sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge_categories.id", ondelete="SET NULL"), nullable=True))
    op.add_column("knowledge_articles", sa.Column("content_type", sa.String(20), nullable=False, server_default="article"))
    op.add_column("knowledge_articles", sa.Column("status", sa.String(20), nullable=False, server_default="published"))
    op.add_column("knowledge_articles", sa.Column("tags", postgresql.JSONB(), nullable=False, server_default="[]"))
    op.add_column("knowledge_articles", sa.Column("video_url", sa.String(1024), nullable=True))
    op.add_column("knowledge_articles", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("knowledge_articles", sa.Column("helpful_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("knowledge_articles", sa.Column("not_helpful_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("knowledge_articles", sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.add_column("knowledge_articles", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_knowledge_articles_status", "knowledge_articles", ["tenant_id", "status"])

    op.create_table(
        "ticket_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reply_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ticket_replies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(120), nullable=False, server_default="application/octet-stream"),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column("uploaded_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_encrypted", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ticket_attachments_ticket", "ticket_attachments", ["ticket_id"])
    op.create_index("ix_ticket_attachments_tenant", "ticket_attachments", ["tenant_id"])

    op.create_table(
        "knowledge_article_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("article_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("summary", sa.String(500), nullable=True),
        sa.Column("changed_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("change_note", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("article_id", "version", name="uq_kb_article_versions"),
    )
    op.create_index("ix_kb_article_versions_article", "knowledge_article_versions", ["article_id"])

    op.create_table(
        "chat_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("portal_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customer_portal_users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("visitor_name", sa.String(150), nullable=True),
        sa.Column("visitor_email", sa.String(320), nullable=True),
        sa.Column("channel", sa.String(30), nullable=False, server_default="live_chat"),
        sa.Column("status", sa.String(30), nullable=False, server_default="waiting"),
        sa.Column("assigned_to_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("rating_comment", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra_data", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_chat_conversations_tenant", "chat_conversations", ["tenant_id"])
    op.create_index("ix_chat_conversations_status", "chat_conversations", ["tenant_id", "status"])
    op.create_index("ix_chat_conversations_agent", "chat_conversations", ["tenant_id", "assigned_to_id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_type", sa.String(20), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("author_name", sa.String(150), nullable=True),
        sa.Column("message_type", sa.String(20), nullable=False, server_default="text"),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("attachments", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_chat_messages_conversation", "chat_messages", ["conversation_id"])
    op.create_index("ix_chat_messages_tenant", "chat_messages", ["tenant_id"])

    op.create_table(
        "customer_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chat_conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("feedback_type", sa.String(30), nullable=False, server_default="csat"),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("source", sa.String(30), nullable=False, server_default="ticket"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_customer_feedback_tenant", "customer_feedback", ["tenant_id"])
    op.create_index("ix_customer_feedback_ticket", "customer_feedback", ["ticket_id"])
    op.create_index("ix_customer_feedback_type", "customer_feedback", ["tenant_id", "feedback_type"])

    op.create_table(
        "agent_performance",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period_key", sa.String(20), nullable=False),
        sa.Column("tickets_assigned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tickets_resolved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tickets_escalated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_response_minutes", sa.Float(), nullable=False, server_default="0"),
        sa.Column("avg_resolution_minutes", sa.Float(), nullable=False, server_default="0"),
        sa.Column("csat_avg", sa.Float(), nullable=False, server_default="0"),
        sa.Column("csat_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chat_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sla_met", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sla_breached", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "user_id", "period_key", name="uq_agent_performance_period"),
    )
    op.create_index("ix_agent_performance_tenant", "agent_performance", ["tenant_id"])


def downgrade() -> None:
    op.drop_table("agent_performance")
    op.drop_table("customer_feedback")
    op.drop_table("chat_messages")
    op.drop_table("chat_conversations")
    op.drop_table("knowledge_article_versions")
    op.drop_table("ticket_attachments")

    op.drop_index("ix_knowledge_articles_status", table_name="knowledge_articles")
    op.drop_column("knowledge_articles", "published_at")
    op.drop_column("knowledge_articles", "updated_by_id")
    op.drop_column("knowledge_articles", "not_helpful_count")
    op.drop_column("knowledge_articles", "helpful_count")
    op.drop_column("knowledge_articles", "version")
    op.drop_column("knowledge_articles", "video_url")
    op.drop_column("knowledge_articles", "tags")
    op.drop_column("knowledge_articles", "status")
    op.drop_column("knowledge_articles", "content_type")
    op.drop_column("knowledge_articles", "category_id")

    op.drop_column("ticket_replies", "is_ai_generated")
    op.drop_column("ticket_replies", "is_internal")

    op.drop_index("ix_support_tickets_archived", table_name="support_tickets")
    op.drop_index("ix_support_tickets_sla", table_name="support_tickets")
    op.drop_index("ix_support_tickets_number", table_name="support_tickets")
    op.drop_index("ix_support_tickets_channel", table_name="support_tickets")
    op.drop_index("ix_support_tickets_priority", table_name="support_tickets")
    op.drop_index("ix_support_tickets_assignee", table_name="support_tickets")

    for col in (
        "extra_data", "csat_score", "last_agent_reply_at", "last_customer_reply_at", "closed_at",
        "is_archived", "parent_ticket_id", "merged_into_id", "tags", "sentiment", "sla_breached",
        "escalation_due_at", "resolution_due_at", "response_due_at", "first_response_at",
        "category_id", "sla_policy_id", "created_by_id", "escalation_level", "source", "channel",
        "ticket_number",
    ):
        op.drop_column("support_tickets", col)

    op.drop_constraint("support_tickets_portal_user_id_fkey", "support_tickets", type_="foreignkey")
    op.alter_column("support_tickets", "portal_user_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.create_foreign_key(
        "support_tickets_portal_user_id_fkey",
        "support_tickets",
        "customer_portal_users",
        ["portal_user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_table("knowledge_categories")
    op.drop_table("sla_policies")
    op.drop_table("ticket_categories")
