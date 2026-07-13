"""Pydantic schemas for Enterprise Administration (Phase 16)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AdminDashboardResponse(BaseModel):
    organization_name: str
    user_count: int
    active_sessions: int
    security_score: int
    audit_events_24h: int
    api_keys_active: int
    storage_used_mb: float
    feature_flags_enabled: int
    custom_fields_count: int
    failed_logins_24h: int
    open_security_events: int


class OrganizationPolicyResponse(BaseModel):
    logo_url: str | None
    primary_color: str
    custom_domains: list[str]
    timezone: str
    locale: str
    currency: str
    business_hours: dict[str, Any]
    branding: dict[str, Any]
    password_policy: dict[str, Any]
    sso_config: dict[str, Any]
    security_settings: dict[str, Any]
    maintenance_mode: bool
    preferences: dict[str, Any]

    model_config = {"from_attributes": True}


class OrganizationPolicyUpdate(BaseModel):
    logo_url: str | None = None
    primary_color: str | None = None
    custom_domains: list[str] | None = None
    timezone: str | None = None
    locale: str | None = None
    currency: str | None = None
    business_hours: dict[str, Any] | None = None
    branding: dict[str, Any] | None = None
    password_policy: dict[str, Any] | None = None
    sso_config: dict[str, Any] | None = None
    security_settings: dict[str, Any] | None = None
    maintenance_mode: bool | None = None
    preferences: dict[str, Any] | None = None


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    resource: str
    resource_id: str | None
    description: str
    ip_address: str | None
    user_agent: str | None
    metadata: dict[str, Any] = Field(validation_alias="metadata_")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class UserSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    device_name: str | None
    user_agent: str | None
    ip_address: str | None
    location: str | None
    is_current: bool
    last_active_at: datetime | None
    created_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}


class LoginHistoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    email: str
    result: str
    ip_address: str | None
    user_agent: str | None
    location: str | None
    failure_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SecurityOverviewResponse(BaseModel):
    security_score: int
    failed_logins_24h: int
    blocked_ips: list[str]
    suspicious_logins: int
    active_sessions: int
    trusted_devices: int
    mfa_enabled_users: int
    open_events: list[dict[str, Any]]
    password_policy: dict[str, Any]


class AdminApiKeyCreate(BaseModel):
    name: str = Field(..., max_length=255)
    scopes: list[str] = Field(default_factory=list)
    rate_limit_per_hour: int = 1000
    expires_in_days: int | None = None


class AdminApiKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    scopes: list[str]
    status: str
    rate_limit_per_hour: int
    usage_count: int
    last_used_at: datetime | None
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminApiKeyCreatedResponse(AdminApiKeyResponse):
    api_key: str


class FeatureFlagCreate(BaseModel):
    key: str = Field(..., max_length=100)
    name: str = Field(..., max_length=255)
    description: str | None = None
    enabled: bool = False
    rollout_percentage: int = 100


class FeatureFlagUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    enabled: bool | None = None
    rollout_percentage: int | None = None


class FeatureFlagResponse(BaseModel):
    id: uuid.UUID
    key: str
    name: str
    description: str | None
    enabled: bool
    scope: str
    rollout_percentage: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CustomFieldCreate(BaseModel):
    entity_type: str
    key: str = Field(..., max_length=80)
    label: str = Field(..., max_length=255)
    field_type: str = "text"
    required: bool = False
    options: list[str] = Field(default_factory=list)
    default_value: str | None = None
    sort_order: int = 0


class CustomFieldUpdate(BaseModel):
    label: str | None = None
    field_type: str | None = None
    required: bool | None = None
    options: list[str] | None = None
    default_value: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CustomFieldResponse(BaseModel):
    id: uuid.UUID
    entity_type: str
    key: str
    label: str
    field_type: str
    required: bool
    options: list
    default_value: str | None
    sort_order: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleCreateRequest(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=50)
    permission_slugs: list[str] = Field(default_factory=list)


class RoleCloneRequest(BaseModel):
    name: str
    slug: str


class PermissionMatrixResponse(BaseModel):
    permissions: list[dict[str, str]]
    roles: list[dict[str, Any]]


class MfaSetupResponse(BaseModel):
    method: str
    secret: str
    qr_uri: str
    backup_codes: list[str]


class MfaVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)


class SsoProviderResponse(BaseModel):
    provider: str
    enabled: bool
    configured: bool


class UserAdminActionRequest(BaseModel):
    reason: str | None = None


class BulkUserImportRequest(BaseModel):
    users: list[dict[str, str]]


class SystemHealthResponse(BaseModel):
    status: str
    database: str
    api_version: str
    uptime_hint: str
    maintenance_mode: bool
