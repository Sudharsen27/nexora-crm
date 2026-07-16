"""Enterprise Developer Platform & Plugin SDK models (Phase 18)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

PLUGIN_TYPES = (
    "crm_module",
    "dashboard_widget",
    "workflow_action",
    "ai_tool",
    "report",
    "theme",
    "notification_provider",
    "storage_provider",
    "integration_connector",
)

PLUGIN_STATUSES = ("draft", "published", "deprecated", "suspended")
INSTALL_STATUSES = ("installed", "enabled", "disabled", "updating", "error")
WEBHOOK_STATUSES = ("active", "paused", "disabled")
WEBHOOK_LOG_STATUSES = ("success", "failed", "retrying")
SDK_PROJECT_TYPES = ("plugin", "widget", "theme", "connector", "sample")
DEVELOPER_STATUSES = ("active", "pending", "suspended")

PLUGIN_CATEGORIES = (
    "productivity",
    "analytics",
    "automation",
    "ai",
    "ui",
    "communication",
    "storage",
    "security",
    "developer",
)

# Seed catalog — AppExchange-style featured plugins
PLUGIN_CATALOG: list[dict] = [
    {
        "slug": "pipeline-pulse-widget",
        "name": "Pipeline Pulse Widget",
        "type": "dashboard_widget",
        "category": "analytics",
        "description": "Live pipeline health widget for executive dashboards.",
        "icon": "gauge",
        "version": "1.2.0",
        "permissions": ["deal:read", "analytics:read"],
        "featured": True,
        "rating": 4.8,
    },
    {
        "slug": "lead-enrichment-ai",
        "name": "Lead Enrichment AI Tool",
        "type": "ai_tool",
        "category": "ai",
        "description": "AI agent tool that enriches leads from public company data.",
        "icon": "sparkles",
        "version": "2.0.1",
        "permissions": ["lead:read", "lead:write", "agent:execute"],
        "featured": True,
        "rating": 4.6,
    },
    {
        "slug": "slack-deal-alerts",
        "name": "Slack Deal Alerts",
        "type": "notification_provider",
        "category": "communication",
        "description": "Push deal stage changes and won events to Slack channels.",
        "icon": "bell",
        "version": "1.4.3",
        "permissions": ["deal:read", "notification:write"],
        "featured": True,
        "rating": 4.7,
    },
    {
        "slug": "auto-task-workflow",
        "name": "Auto Task Workflow Action",
        "type": "workflow_action",
        "category": "automation",
        "description": "Workflow action that creates follow-up tasks with SLA timers.",
        "icon": "workflow",
        "version": "1.1.0",
        "permissions": ["workflow:write", "task:write"],
        "featured": False,
        "rating": 4.4,
    },
    {
        "slug": "nexora-midnight-theme",
        "name": "Nexora Midnight Theme",
        "type": "theme",
        "category": "ui",
        "description": "Premium dark enterprise theme with glassmorphism accents.",
        "icon": "palette",
        "version": "3.0.0",
        "permissions": [],
        "featured": True,
        "rating": 4.9,
    },
    {
        "slug": "revenue-forecast-report",
        "name": "Revenue Forecast Report",
        "type": "report",
        "category": "analytics",
        "description": "BI report pack for quarterly revenue forecasting.",
        "icon": "bar-chart",
        "version": "1.0.5",
        "permissions": ["bi:read", "report:read"],
        "featured": False,
        "rating": 4.3,
    },
    {
        "slug": "s3-document-storage",
        "name": "S3 Document Storage",
        "type": "storage_provider",
        "category": "storage",
        "description": "Store CRM documents in customer-managed S3 buckets.",
        "icon": "hard-drive",
        "version": "2.1.0",
        "permissions": ["document:write"],
        "featured": False,
        "rating": 4.5,
    },
    {
        "slug": "hubspot-bridge",
        "name": "HubSpot Bridge Connector",
        "type": "integration_connector",
        "category": "developer",
        "description": "Bidirectional contact and deal sync connector template.",
        "icon": "plug",
        "version": "0.9.2",
        "permissions": ["contact:write", "deal:write", "integration:write"],
        "featured": True,
        "rating": 4.2,
    },
    {
        "slug": "customer-health-module",
        "name": "Customer Health CRM Module",
        "type": "crm_module",
        "category": "productivity",
        "description": "Adds health scores and risk flags to companies and contacts.",
        "icon": "heart-pulse",
        "version": "1.3.1",
        "permissions": ["company:write", "contact:write"],
        "featured": False,
        "rating": 4.1,
    },
]


class Developer(Base, TimestampMixin):
    __tablename__ = "developers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_developers_tenant_slug"),
        Index("ix_developers_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    website: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    api_calls_30d: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    plugins: Mapped[list["Plugin"]] = relationship(back_populates="developer", cascade="all, delete-orphan")
    sdk_projects: Mapped[list["SdkProject"]] = relationship(
        back_populates="developer", cascade="all, delete-orphan"
    )


class Plugin(Base, TimestampMixin):
    __tablename__ = "plugins"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_plugins_slug"),
        Index("ix_plugins_type", "plugin_type"),
        Index("ix_plugins_category", "category"),
        Index("ix_plugins_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("developers.id", ondelete="SET NULL"), nullable=True
    )
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    plugin_type: Mapped[str] = mapped_column(String(40), nullable=False, default="crm_module")
    category: Mapped[str] = mapped_column(String(40), nullable=False, default="developer")
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="puzzle")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="published")
    latest_version: Mapped[str] = mapped_column(String(30), nullable=False, default="1.0.0")
    permissions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    dependencies: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    settings_schema: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    manifest: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_official: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    install_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    developer: Mapped["Developer | None"] = relationship(back_populates="plugins")
    versions: Mapped[list["PluginVersion"]] = relationship(
        back_populates="plugin", cascade="all, delete-orphan"
    )
    installations: Mapped[list["PluginInstallation"]] = relationship(
        back_populates="plugin", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["MarketplaceReview"]] = relationship(
        back_populates="plugin", cascade="all, delete-orphan"
    )
    logs: Mapped[list["PluginLog"]] = relationship(
        back_populates="plugin", cascade="all, delete-orphan"
    )


class PluginVersion(Base, TimestampMixin):
    __tablename__ = "plugin_versions"
    __table_args__ = (
        UniqueConstraint("plugin_id", "version", name="uq_plugin_versions_plugin_version"),
        Index("ix_plugin_versions_plugin", "plugin_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plugin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plugins.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[str] = mapped_column(String(30), nullable=False)
    changelog: Mapped[str | None] = mapped_column(Text, nullable=True)
    package_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True)
    min_platform_version: Mapped[str] = mapped_column(String(30), nullable=False, default="18.0.0")
    is_yanked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    download_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    manifest: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    plugin: Mapped["Plugin"] = relationship(back_populates="versions")


class PluginInstallation(Base, TimestampMixin):
    __tablename__ = "plugin_installations"
    __table_args__ = (
        UniqueConstraint("tenant_id", "plugin_id", name="uq_plugin_installations_tenant_plugin"),
        Index("ix_plugin_installations_tenant", "tenant_id"),
        Index("ix_plugin_installations_status", "tenant_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    plugin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plugins.id", ondelete="CASCADE"), nullable=False
    )
    installed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    installed_version: Mapped[str] = mapped_column(String(30), nullable=False, default="1.0.0")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="enabled")
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    granted_permissions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    plugin: Mapped["Plugin"] = relationship(back_populates="installations")


class PluginLog(Base, TimestampMixin):
    __tablename__ = "plugin_logs"
    __table_args__ = (
        Index("ix_plugin_logs_tenant", "tenant_id"),
        Index("ix_plugin_logs_plugin", "plugin_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    plugin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plugins.id", ondelete="SET NULL"), nullable=True
    )
    installation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plugin_installations.id", ondelete="SET NULL"), nullable=True
    )
    level: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    event: Mapped[str] = mapped_column(String(80), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    plugin: Mapped["Plugin | None"] = relationship(back_populates="logs")


class PlatformWebhook(Base, TimestampMixin):
    """Developer Platform outbound webhooks (distinct from Integration Hub webhooks)."""

    __tablename__ = "platform_webhooks"
    __table_args__ = (
        Index("ix_platform_webhooks_tenant", "tenant_id"),
        Index("ix_platform_webhooks_status", "tenant_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    secret: Mapped[str | None] = mapped_column(String(128), nullable=True)
    events: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    retry_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    logs: Mapped[list["PlatformWebhookLog"]] = relationship(
        back_populates="webhook", cascade="all, delete-orphan"
    )


class PlatformWebhookLog(Base, TimestampMixin):
    __tablename__ = "platform_webhook_logs"
    __table_args__ = (
        Index("ix_platform_webhook_logs_webhook", "webhook_id"),
        Index("ix_platform_webhook_logs_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platform_webhooks.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success")
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    request_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    webhook: Mapped["PlatformWebhook"] = relationship(back_populates="logs")


class SdkProject(Base, TimestampMixin):
    __tablename__ = "sdk_projects"
    __table_args__ = (
        Index("ix_sdk_projects_tenant", "tenant_id"),
        Index("ix_sdk_projects_developer", "developer_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    developer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("developers.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    project_type: Mapped[str] = mapped_column(String(40), nullable=False, default="plugin")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sdk_version: Mapped[str] = mapped_column(String(30), nullable=False, default="1.0.0")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    sample_code: Mapped[str | None] = mapped_column(Text, nullable=True)

    developer: Mapped["Developer | None"] = relationship(back_populates="sdk_projects")


class MarketplaceReview(Base, TimestampMixin):
    __tablename__ = "marketplace_reviews"
    __table_args__ = (
        UniqueConstraint("tenant_id", "plugin_id", "user_id", name="uq_marketplace_reviews_unique"),
        Index("ix_marketplace_reviews_plugin", "plugin_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    plugin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plugins.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified_install: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    plugin: Mapped["Plugin"] = relationship(back_populates="reviews")


class ApiUsageEvent(Base, TimestampMixin):
    """Lightweight public API usage meter for Developer Console."""

    __tablename__ = "api_usage_events"
    __table_args__ = (
        Index("ix_api_usage_events_tenant_created", "tenant_id", "created_at"),
        Index("ix_api_usage_events_resource", "tenant_id", "resource"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resource: Mapped[str] = mapped_column(String(80), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False, default="GET")
    status_code: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    api_style: Mapped[str] = mapped_column(String(20), nullable=False, default="rest")
