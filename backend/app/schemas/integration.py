"""Pydantic schemas for Integrations & API Marketplace."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class MarketplaceAppSummary(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    vendor: str
    category: str
    description: str | None
    icon: str
    auth_type: str
    is_popular: bool
    is_recommended: bool
    is_developer: bool
    capabilities: list[str]
    install_count: int
    is_installed: bool = False

    model_config = {"from_attributes": True}


class IntegrationSummary(BaseModel):
    id: uuid.UUID
    status: str
    health: str
    sync_mode: str
    auto_sync: bool
    last_sync_at: datetime | None
    connected_at: datetime | None
    last_error: str | None
    app_slug: str
    app_name: str
    app_icon: str
    app_category: str

    model_config = {"from_attributes": True}


class IntegrationDetail(IntegrationSummary):
    settings: dict[str, Any]
    permissions: list[str]
    sync_interval_minutes: int
    marketplace_app_id: uuid.UUID
    account_label: str | None = None
    auth_type: str | None = None


class IntegrationConnectRequest(BaseModel):
    api_key: str | None = None
    api_secret: str | None = None
    oauth_code: str | None = None
    label: str = "Default"
    settings: dict[str, Any] = Field(default_factory=dict)


class IntegrationSettingsUpdate(BaseModel):
    auto_sync: bool | None = None
    sync_mode: str | None = None
    sync_interval_minutes: int | None = Field(default=None, ge=5, le=10080)
    settings: dict[str, Any] | None = None
    permissions: list[str] | None = None


class IntegrationInstallRequest(BaseModel):
    app_slug: str = Field(min_length=1, max_length=80)


class SyncHistoryResponse(BaseModel):
    id: uuid.UUID
    sync_mode: str
    status: str
    records_processed: int
    records_failed: int
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class IntegrationHealthResponse(BaseModel):
    integration_id: uuid.UUID
    health: str
    status: str
    last_sync_at: datetime | None
    last_error: str | None
    latency_ms: int | None = None
    checks: list[dict[str, Any]] = Field(default_factory=list)


class WebhookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=2048)
    events: list[str] = Field(default_factory=lambda: ["*"])
    integration_id: uuid.UUID | None = None
    retry_count: int = Field(default=3, ge=0, le=10)


class WebhookUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = Field(default=None, min_length=1, max_length=2048)
    events: list[str] | None = None
    status: str | None = None
    retry_count: int | None = Field(default=None, ge=0, le=10)


class WebhookResponse(BaseModel):
    id: uuid.UUID
    name: str
    url: str
    events: list[str]
    status: str
    retry_count: int
    last_triggered_at: datetime | None
    integration_id: uuid.UUID | None

    model_config = {"from_attributes": True}


class WebhookLogResponse(BaseModel):
    id: uuid.UUID
    webhook_id: uuid.UUID
    event_type: str
    status: str
    status_code: int | None
    attempt: int
    duration_ms: int | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    scopes: list[str] = Field(default_factory=lambda: ["read", "write"])
    expires_in_days: int | None = Field(default=365, ge=1, le=3650)
    rate_limit_per_hour: int = Field(default=1000, ge=100, le=100000)


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    scopes: list[str]
    status: str
    last_used_at: datetime | None
    expires_at: datetime | None
    usage_count: int
    rate_limit_per_hour: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreatedResponse(ApiKeyResponse):
    api_key: str


class OAuthAuthorizeResponse(BaseModel):
    authorize_url: str
    state: str


class IntegrationDashboardResponse(BaseModel):
    installed_count: int
    connected_count: int
    healthy_count: int
    error_count: int
    webhook_count: int
    api_key_count: int
    total_api_calls: int
    recent_syncs: list[SyncHistoryResponse]
    recent_webhook_logs: list[WebhookLogResponse]
    installed_apps: list[IntegrationSummary]


class MarketplaceListResponse(BaseModel):
    apps: list[MarketplaceAppSummary]
    categories: list[str]
    total: int
