"""Enterprise Integrations & API Marketplace models (Phase 14)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

INTEGRATION_STATUSES = ("available", "installed", "connected", "disconnected", "error", "syncing")
INTEGRATION_AUTH_TYPES = ("oauth2", "api_key", "webhook", "none")
INTEGRATION_HEALTH = ("healthy", "degraded", "unhealthy", "unknown")
SYNC_STATUSES = ("pending", "running", "completed", "failed", "cancelled")
SYNC_MODES = ("manual", "scheduled", "realtime")
WEBHOOK_STATUSES = ("active", "paused", "disabled")
WEBHOOK_LOG_STATUSES = ("success", "failed", "retrying")
API_KEY_STATUSES = ("active", "revoked", "expired")

MARKETPLACE_CATEGORIES = (
    "productivity",
    "communication",
    "payments",
    "email",
    "storage",
    "developer",
    "project_management",
    "video",
    "messaging",
    "automation",
)


class MarketplaceApp(Base, TimestampMixin):
    __tablename__ = "marketplace_apps"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_marketplace_apps_slug"),
        Index("ix_marketplace_apps_category", "category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    vendor: Mapped[str] = mapped_column(String(255), nullable=False, default="Nexora")
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="automation")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="plug")
    auth_type: Mapped[str] = mapped_column(String(20), nullable=False, default="oauth2")
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_developer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    config_schema: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    oauth_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    capabilities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    install_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Integration(Base, TimestampMixin):
    __tablename__ = "integrations"
    __table_args__ = (
        UniqueConstraint("tenant_id", "marketplace_app_id", name="uq_integrations_tenant_app"),
        Index("ix_integrations_tenant", "tenant_id"),
        Index("ix_integrations_tenant_status", "tenant_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    marketplace_app_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("marketplace_apps.id", ondelete="CASCADE"), nullable=False
    )
    installed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="installed")
    health: Mapped[str] = mapped_column(String(20), nullable=False, default="unknown")
    sync_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    auto_sync: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sync_interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    permissions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    marketplace_app: Mapped["MarketplaceApp"] = relationship()
    accounts: Mapped[list["IntegrationAccount"]] = relationship(
        back_populates="integration", cascade="all, delete-orphan"
    )
    sync_history: Mapped[list["SyncHistory"]] = relationship(
        back_populates="integration", cascade="all, delete-orphan"
    )


class IntegrationAccount(Base, TimestampMixin):
    __tablename__ = "integration_accounts"
    __table_args__ = (Index("ix_integration_accounts_integration", "integration_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("integrations.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False, default="Default")
    auth_type: Mapped[str] = mapped_column(String(20), nullable=False, default="oauth2")
    external_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    credentials_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    account_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    integration: Mapped["Integration"] = relationship(back_populates="accounts")
    oauth_tokens: Mapped[list["OAuthToken"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class OAuthToken(Base, TimestampMixin):
    __tablename__ = "oauth_tokens"
    __table_args__ = (Index("ix_oauth_tokens_account", "account_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("integration_accounts.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_type: Mapped[str] = mapped_column(String(30), nullable=False, default="Bearer")
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    account: Mapped["IntegrationAccount"] = relationship(back_populates="oauth_tokens")


class Webhook(Base, TimestampMixin):
    __tablename__ = "integration_webhooks"
    __table_args__ = (
        Index("ix_integration_webhooks_tenant", "tenant_id"),
        Index("ix_integration_webhooks_integration", "integration_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    integration_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("integrations.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    secret_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    events: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    logs: Mapped[list["WebhookLog"]] = relationship(
        back_populates="webhook", cascade="all, delete-orphan"
    )


class WebhookLog(Base, TimestampMixin):
    __tablename__ = "integration_webhook_logs"
    __table_args__ = (Index("ix_integration_webhook_logs_webhook", "webhook_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("integration_webhooks.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, default="*")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success")
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    request_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    webhook: Mapped["Webhook"] = relationship(back_populates="logs")


class ApiKey(Base, TimestampMixin):
    __tablename__ = "integration_api_keys"
    __table_args__ = (
        Index("ix_integration_api_keys_tenant", "tenant_id"),
        Index("ix_integration_api_keys_prefix", "key_prefix"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    scopes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rate_limit_per_hour: Mapped[int] = mapped_column(Integer, nullable=False, default=1000)


class SyncHistory(Base, TimestampMixin):
    __tablename__ = "integration_sync_history"
    __table_args__ = (Index("ix_integration_sync_history_integration", "integration_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("integrations.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    sync_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    records_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    integration: Mapped["Integration"] = relationship(back_populates="sync_history")
