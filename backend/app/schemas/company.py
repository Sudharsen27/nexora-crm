from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.company import COMPANY_INDUSTRIES, COMPANY_SORT_FIELDS


class CompanyCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    company_code: str | None = Field(default=None, max_length=50)
    industry: str | None = Field(default=None, max_length=100)
    website: str | None = Field(default=None, max_length=500)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    annual_revenue: Decimal | None = Field(default=None, ge=0)
    employee_count: int | None = Field(default=None, ge=0)
    owner_id: UUID | None = None
    description: str | None = Field(default=None, max_length=10000)

    @field_validator(
        "company_name",
        "company_code",
        "industry",
        "website",
        "address",
        "city",
        "state",
        "country",
        "postal_code",
        "description",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
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

    @field_validator("industry")
    @classmethod
    def validate_industry(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in COMPANY_INDUSTRIES:
            raise ValueError(f"Industry must be one of: {', '.join(COMPANY_INDUSTRIES)}")
        return normalized


class CompanyUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    company_code: str | None = Field(default=None, max_length=50)
    industry: str | None = Field(default=None, max_length=100)
    website: str | None = Field(default=None, max_length=500)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    annual_revenue: Decimal | None = Field(default=None, ge=0)
    employee_count: int | None = Field(default=None, ge=0)
    owner_id: UUID | None = None
    description: str | None = Field(default=None, max_length=10000)

    @field_validator(
        "company_name",
        "company_code",
        "industry",
        "website",
        "address",
        "city",
        "state",
        "country",
        "postal_code",
        "description",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
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

    @field_validator("industry")
    @classmethod
    def validate_industry(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in COMPANY_INDUSTRIES:
            raise ValueError(f"Industry must be one of: {', '.join(COMPANY_INDUSTRIES)}")
        return normalized

    @model_validator(mode="after")
    def validate_at_least_one_field(self) -> "CompanyUpdate":
        if not any(
            getattr(self, field) is not None
            for field in (
                "company_name",
                "company_code",
                "industry",
                "website",
                "email",
                "phone",
                "address",
                "city",
                "state",
                "country",
                "postal_code",
                "annual_revenue",
                "employee_count",
                "owner_id",
                "description",
            )
        ):
            raise ValueError("At least one field must be provided")
        return self


class CompanyOwner(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    company_name: str
    company_code: str | None
    industry: str | None
    website: str | None
    email: str | None
    phone: str | None
    address: str | None
    city: str | None
    state: str | None
    country: str | None
    postal_code: str | None
    annual_revenue: Decimal | None
    employee_count: int | None
    owner_id: UUID | None
    owner: CompanyOwner | None = None
    description: str | None
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime


class CompanyListResponse(BaseModel):
    items: list[CompanyResponse]
    total: int
    page: int
    page_size: int
    pages: int


class CompanyMetaResponse(BaseModel):
    industries: list[str]
    sort_fields: list[str]
