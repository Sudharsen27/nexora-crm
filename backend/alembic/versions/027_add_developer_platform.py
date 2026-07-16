"""Add Enterprise Developer Platform & Plugin SDK tables (Phase 18).

Revision ID: 027
Revises: 026
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "027"
down_revision: Union[str, None] = "026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "developers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("website", sa.String(512), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("api_calls_30d", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_developers_tenant_slug"),
    )
    op.create_index("ix_developers_tenant", "developers", ["tenant_id"])

    op.create_table(
        "plugins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("developer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("developers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("plugin_type", sa.String(40), nullable=False, server_default="crm_module"),
        sa.Column("category", sa.String(40), nullable=False, server_default="developer"),
        sa.Column("icon", sa.String(50), nullable=False, server_default="puzzle"),
        sa.Column("status", sa.String(20), nullable=False, server_default="published"),
        sa.Column("latest_version", sa.String(30), nullable=False, server_default="1.0.0"),
        sa.Column("permissions", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("dependencies", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("settings_schema", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("manifest", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_official", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("install_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_rating", sa.Float(), nullable=False, server_default="0"),
        sa.Column("review_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("slug", name="uq_plugins_slug"),
    )
    op.create_index("ix_plugins_type", "plugins", ["plugin_type"])
    op.create_index("ix_plugins_category", "plugins", ["category"])
    op.create_index("ix_plugins_status", "plugins", ["status"])

    op.create_table(
        "plugin_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plugin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plugins.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.String(30), nullable=False),
        sa.Column("changelog", sa.Text(), nullable=True),
        sa.Column("package_url", sa.String(1024), nullable=True),
        sa.Column("checksum", sa.String(128), nullable=True),
        sa.Column("min_platform_version", sa.String(30), nullable=False, server_default="18.0.0"),
        sa.Column("is_yanked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("download_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("manifest", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("plugin_id", "version", name="uq_plugin_versions_plugin_version"),
    )
    op.create_index("ix_plugin_versions_plugin", "plugin_versions", ["plugin_id"])

    op.create_table(
        "plugin_installations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plugin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plugins.id", ondelete="CASCADE"), nullable=False),
        sa.Column("installed_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("installed_version", sa.String(30), nullable=False, server_default="1.0.0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="enabled"),
        sa.Column("settings", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("granted_permissions", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("enabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "plugin_id", name="uq_plugin_installations_tenant_plugin"),
    )
    op.create_index("ix_plugin_installations_tenant", "plugin_installations", ["tenant_id"])
    op.create_index("ix_plugin_installations_status", "plugin_installations", ["tenant_id", "status"])

    op.create_table(
        "plugin_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plugin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plugins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("installation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plugin_installations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("level", sa.String(20), nullable=False, server_default="info"),
        sa.Column("event", sa.String(80), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("details", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_plugin_logs_tenant", "plugin_logs", ["tenant_id"])
    op.create_index("ix_plugin_logs_plugin", "plugin_logs", ["plugin_id"])

    op.create_table(
        "platform_webhooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("secret", sa.String(128), nullable=True),
        sa.Column("events", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("retry_limit", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("success_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_platform_webhooks_tenant", "platform_webhooks", ["tenant_id"])
    op.create_index("ix_platform_webhooks_status", "platform_webhooks", ["tenant_id", "status"])

    op.create_table(
        "platform_webhook_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("webhook_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("platform_webhooks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="success"),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("request_payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_platform_webhook_logs_webhook", "platform_webhook_logs", ["webhook_id"])
    op.create_index("ix_platform_webhook_logs_tenant", "platform_webhook_logs", ["tenant_id"])

    op.create_table(
        "sdk_projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("developer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("developers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("project_type", sa.String(40), nullable=False, server_default="plugin"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sdk_version", sa.String(30), nullable=False, server_default="1.0.0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("sample_code", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sdk_projects_tenant", "sdk_projects", ["tenant_id"])
    op.create_index("ix_sdk_projects_developer", "sdk_projects", ["developer_id"])

    op.create_table(
        "marketplace_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plugin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plugins.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("is_verified_install", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "plugin_id", "user_id", name="uq_marketplace_reviews_unique"),
    )
    op.create_index("ix_marketplace_reviews_plugin", "marketplace_reviews", ["plugin_id"])

    op.create_table(
        "api_usage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resource", sa.String(80), nullable=False),
        sa.Column("method", sa.String(10), nullable=False, server_default="GET"),
        sa.Column("status_code", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("api_style", sa.String(20), nullable=False, server_default="rest"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_api_usage_events_tenant_created", "api_usage_events", ["tenant_id", "created_at"])
    op.create_index("ix_api_usage_events_resource", "api_usage_events", ["tenant_id", "resource"])


def downgrade() -> None:
    op.drop_table("api_usage_events")
    op.drop_table("marketplace_reviews")
    op.drop_table("sdk_projects")
    op.drop_table("platform_webhook_logs")
    op.drop_table("platform_webhooks")
    op.drop_table("plugin_logs")
    op.drop_table("plugin_installations")
    op.drop_table("plugin_versions")
    op.drop_table("plugins")
    op.drop_table("developers")
