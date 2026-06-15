from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.lead import LEAD_SOURCES, LEAD_STATUSES


class LeadCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    company: str | None = Field(default=None, max_length=255)
    job_title: str | None = Field(default=None, max_length=150)
    status: str = Field(default="new")
    source: str | None = None
    estimated_value: Decimal | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=5000)
    assigned_to_id: UUID | None = None

    @field_validator("first_name", "last_name", "company", "job_title", "notes", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in LEAD_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(LEAD_STATUSES)}")
        return value

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str | None) -> str | None:
        if value is not None and value not in LEAD_SOURCES:
            raise ValueError(f"Source must be one of: {', '.join(LEAD_SOURCES)}")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        cleaned = value.strip()
        if len(cleaned) < 6:
            raise ValueError("Phone number is too short")
        return cleaned

    @model_validator(mode="after")
    def validate_name(self) -> "LeadCreate":
        if not self.first_name and not self.last_name:
            raise ValueError("First name or last name is required")
        return self


class LeadUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    company: str | None = Field(default=None, max_length=255)
    job_title: str | None = Field(default=None, max_length=150)
    status: str | None = None
    source: str | None = None
    estimated_value: Decimal | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=5000)
    assigned_to_id: UUID | None = None

    @field_validator("first_name", "last_name", "company", "job_title", "notes", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in LEAD_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(LEAD_STATUSES)}")
        return value

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str | None) -> str | None:
        if value is not None and value not in LEAD_SOURCES:
            raise ValueError(f"Source must be one of: {', '.join(LEAD_SOURCES)}")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        cleaned = value.strip()
        if len(cleaned) < 6:
            raise ValueError("Phone number is too short")
        return cleaned


class LeadAssignee(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    company: str | None
    job_title: str | None
    status: str
    source: str | None
    estimated_value: Decimal | None
    notes: str | None
    assigned_to_id: UUID | None
    assigned_to: LeadAssignee | None = None
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime


class LeadListResponse(BaseModel):
    items: list[LeadResponse]
    total: int
    page: int
    page_size: int
    pages: int


class LeadMetaResponse(BaseModel):
    statuses: list[str]
    sources: list[str]
