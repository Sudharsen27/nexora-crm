"""Pydantic schemas for Developer Platform & Plugin SDK (Phase 18)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DeveloperResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    display_name: str
    email: str | None = None
    website: str | None = None
    bio: str | None = None
    status: str
    verified: bool
    api_calls_30d: int
    created_at: datetime


class DeveloperUpsert(BaseModel):
    display_name: str = Field(min_length=2, max_length=255)
    email: str | None = None
    website: str | None = None
    bio: str | None = None


class PluginSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    description: str | None = None
    plugin_type: str
    category: str
    icon: str
    status: str
    latest_version: str
    permissions: list = Field(default_factory=list)
    is_featured: bool
    is_official: bool
    install_count: int
    avg_rating: float
    review_count: int
    installed: bool = False
    install_status: str | None = None


class PluginDetail(PluginSummary):
    dependencies: list = Field(default_factory=list)
    settings_schema: dict = Field(default_factory=dict)
    manifest: dict = Field(default_factory=dict)
    versions: list["PluginVersionResponse"] = Field(default_factory=list)
    reviews: list["MarketplaceReviewResponse"] = Field(default_factory=list)


class PluginVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    version: str
    changelog: str | None = None
    package_url: str | None = None
    min_platform_version: str
    is_yanked: bool
    download_count: int
    created_at: datetime


class PluginInstallRequest(BaseModel):
    plugin_slug: str
    settings: dict = Field(default_factory=dict)


class PluginSettingsUpdate(BaseModel):
    settings: dict = Field(default_factory=dict)


class PluginInstallationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plugin_id: UUID
    installed_version: str
    status: str
    settings: dict = Field(default_factory=dict)
    granted_permissions: list = Field(default_factory=list)
    last_error: str | None = None
    enabled_at: datetime | None = None
    disabled_at: datetime | None = None
    created_at: datetime
    plugin: PluginSummary | None = None


class PluginLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plugin_id: UUID | None = None
    level: str
    event: str
    message: str
    details: dict = Field(default_factory=dict)
    created_at: datetime


class MarketplaceListResponse(BaseModel):
    items: list[PluginSummary]
    total: int
    categories: list[str]
    types: list[str]


class MarketplaceReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str | None = None
    body: str | None = None


class MarketplaceReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plugin_id: UUID
    rating: int
    title: str | None = None
    body: str | None = None
    is_verified_install: bool
    created_at: datetime


class PlatformWebhookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=8, max_length=2048)
    events: list[str] = Field(default_factory=lambda: ["*"])
    retry_limit: int = Field(default=3, ge=0, le=10)


class PlatformWebhookUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    events: list[str] | None = None
    status: str | None = None
    retry_limit: int | None = None


class PlatformWebhookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    url: str
    secret: str | None = None
    events: list = Field(default_factory=list)
    status: str
    retry_limit: int
    success_count: int
    failure_count: int
    last_triggered_at: datetime | None = None
    created_at: datetime


class PlatformWebhookLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    webhook_id: UUID
    event_type: str
    status: str
    status_code: int | None = None
    attempt: int
    duration_ms: int
    request_payload: dict = Field(default_factory=dict)
    response_body: str | None = None
    error_message: str | None = None
    created_at: datetime


class SdkProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    project_type: str = "plugin"
    description: str | None = None


class SdkProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    project_type: str
    description: str | None = None
    sdk_version: str
    status: str
    config: dict = Field(default_factory=dict)
    sample_code: str | None = None
    created_at: datetime


class CliActionRequest(BaseModel):
    action: str
    name: str | None = None
    plugin_type: str = "crm_module"
    version: str = "1.0.0"


class CliActionResponse(BaseModel):
    success: bool
    action: str
    message: str
    output: dict = Field(default_factory=dict)


class GraphQLRequest(BaseModel):
    query: str
    variables: dict = Field(default_factory=dict)


class GraphQLResponse(BaseModel):
    data: dict | None = None
    errors: list[dict] | None = None
    extensions: dict | None = None


class RestExplorerRequest(BaseModel):
    method: str = "GET"
    path: str
    body: dict | None = None


class RestExplorerResponse(BaseModel):
    status_code: int
    duration_ms: int
    headers: dict
    body: dict | list | str | None


class DeveloperDashboardResponse(BaseModel):
    installed_plugins: int
    enabled_plugins: int
    marketplace_plugins: int
    featured_plugins: int
    webhook_count: int
    webhook_failures_24h: int
    api_calls_24h: int
    sdk_projects: int
    developer: DeveloperResponse | None = None
    recent_installs: list[PluginInstallationResponse] = Field(default_factory=list)
    recent_webhook_logs: list[PlatformWebhookLogResponse] = Field(default_factory=list)
    featured: list[PluginSummary] = Field(default_factory=list)
    api_usage: list[dict] = Field(default_factory=list)
    docs: list[dict] = Field(default_factory=list)
    cli_commands: list[dict] = Field(default_factory=list)
    graphql_sdl: str = ""
