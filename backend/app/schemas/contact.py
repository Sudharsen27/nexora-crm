from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.contact import CONTACT_SORT_FIELDS


class ContactCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    company: str | None = Field(default=None, max_length=255)
    job_title: str | None = Field(default=None, max_length=150)
    lead_id: UUID | None = None
    company_id: UUID | None = None
    assigned_to_id: UUID | None = None

    @field_validator("first_name", "last_name", "company", "job_title", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
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
    def validate_name(self) -> "ContactCreate":
        if not self.first_name and not self.last_name:
            raise ValueError("First name or last name is required")
        return self


class ContactUpdate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    company: str | None = Field(default=None, max_length=255)
    job_title: str | None = Field(default=None, max_length=150)
    lead_id: UUID | None = None
    company_id: UUID | None = None
    assigned_to_id: UUID | None = None

    @field_validator("first_name", "last_name", "company", "job_title", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
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
    def validate_name(self) -> "ContactUpdate":
        if not self.first_name and not self.last_name:
            raise ValueError("First name or last name is required")
        return self


class ContactAssignee(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr


class ContactLeadRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    status: str


class ContactCompanyRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_name: str
    company_code: str | None = None


class ContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    lead_id: UUID | None
    company_id: UUID | None
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    company: str | None
    job_title: str | None
    assigned_to_id: UUID | None
    assigned_to: ContactAssignee | None = None
    lead: ContactLeadRef | None = None
    linked_company: ContactCompanyRef | None = None
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int
    page: int
    page_size: int
    pages: int
