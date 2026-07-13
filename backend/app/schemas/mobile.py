"""Pydantic schemas for Mobile PWA & Offline CRM (Phase 15)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class OfflineQueueItemCreate(BaseModel):
    client_id: str = Field(..., max_length=64)
    resource: str = Field(..., max_length=50)
    action: str = Field(..., max_length=20)
    entity_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class OfflineQueueItemResponse(BaseModel):
    id: uuid.UUID
    client_id: str
    resource: str
    action: str
    entity_id: str | None
    payload: dict[str, Any]
    status: str
    retry_count: int
    error_message: str | None
    created_at: datetime
    processed_at: datetime | None

    model_config = {"from_attributes": True}


class OfflineQueueBatchRequest(BaseModel):
    items: list[OfflineQueueItemCreate]


class OfflineQueueBatchResponse(BaseModel):
    accepted: int
    items: list[OfflineQueueItemResponse]


class SyncResourceRequest(BaseModel):
    resources: list[str] = Field(default_factory=list)
    direction: str = "bidirectional"
    since: datetime | None = None


class SyncConflictResponse(BaseModel):
    id: uuid.UUID
    resource: str
    entity_id: str
    client_version: dict[str, Any]
    server_version: dict[str, Any]
    status: str
    resolution: str | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class SyncSessionResponse(BaseModel):
    id: uuid.UUID
    direction: str
    status: str
    resources: list[str]
    items_uploaded: int
    items_downloaded: int
    conflicts_found: int
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SyncDataResponse(BaseModel):
    session: SyncSessionResponse
    data: dict[str, list[dict[str, Any]]]
    conflicts: list[SyncConflictResponse]
    server_time: datetime


class ConflictResolveRequest(BaseModel):
    resolution: str = Field(..., pattern="^(client_wins|server_wins|merged|manual)$")
    merged_data: dict[str, Any] | None = None


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict[str, str]
    user_agent: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)


class PushSubscriptionResponse(BaseModel):
    id: uuid.UUID
    endpoint: str
    status: str
    preferences: dict[str, Any]
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}


class MobileSettingsResponse(BaseModel):
    offline_enabled: bool
    background_sync: bool
    push_enabled: bool
    auto_download: bool
    cache_resources: list[str]
    last_sync_at: datetime | None
    storage_used_bytes: int
    preferences: dict[str, Any]

    model_config = {"from_attributes": True}


class MobileSettingsUpdate(BaseModel):
    offline_enabled: bool | None = None
    background_sync: bool | None = None
    push_enabled: bool | None = None
    auto_download: bool | None = None
    cache_resources: list[str] | None = None
    storage_used_bytes: int | None = None
    preferences: dict[str, Any] | None = None


class MobileDashboardResponse(BaseModel):
    is_online: bool = True
    offline_queue_pending: int
    open_conflicts: int
    last_sync_at: datetime | None
    storage_used_bytes: int
    push_subscriptions: int
    recent_sessions: list[SyncSessionResponse]
    cacheable_resources: list[str]
