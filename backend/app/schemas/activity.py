from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.activity import ACTIVITY_TYPES, ENTITY_TYPES


class ActivityCreate(BaseModel):
    entity_type: str = Field(min_length=1, max_length=30)
    entity_id: UUID
    activity_type: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=1, max_length=5000)
    metadata: dict[str, Any] | None = None
    scheduled_at: datetime | None = None

    @field_validator("entity_type")
    @classmethod
    def validate_entity_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ENTITY_TYPES:
            raise ValueError(f"entity_type must be one of: {', '.join(ENTITY_TYPES)}")
        return normalized

    @field_validator("activity_type")
    @classmethod
    def validate_activity_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ACTIVITY_TYPES:
            raise ValueError(f"activity_type must be one of: {', '.join(ACTIVITY_TYPES)}")
        return normalized

    @field_validator("description", mode="before")
    @classmethod
    def strip_description(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip()
        return value


class ActivityCreator(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    entity_type: str
    entity_id: UUID
    activity_type: str
    description: str
    metadata: dict[str, Any] | None = None
    created_by_id: UUID | None
    created_by: ActivityCreator | None = None
    created_at: datetime
    scheduled_at: datetime | None = None


class ActivityListResponse(BaseModel):
    items: list[ActivityResponse]
    total: int
    page: int
    page_size: int
    pages: int
