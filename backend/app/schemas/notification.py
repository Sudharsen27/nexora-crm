from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Self
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class NotificationPriority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class NotificationCategory(str, Enum):
    all = "all"
    deals = "deals"
    companies = "companies"
    contacts = "contacts"
    tasks = "tasks"
    meetings = "meetings"
    notes = "notes"
    system = "system"


class NotificationActor(BaseModel):
    id: UUID
    full_name: str
    email: str | None = None


class NotificationResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    actor_id: UUID | None
    actor: NotificationActor | None
    type: str
    title: str
    message: str
    entity_type: str | None
    entity_id: UUID | None
    priority: str
    read: bool
    read_at: datetime | None
    action_url: str | None
    metadata: dict[str, Any] | None = None
    archived_at: datetime | None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int
    next_cursor: str | None = None
    has_more: bool = False


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int


class NotificationBulkIds(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=100)


class NotificationBulkResult(BaseModel):
    affected: int


class NotificationMarkRead(BaseModel):
    read: bool = True
