from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.deal import DEAL_STAGES


class DealCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    stage: str = Field(default="new")
    value: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    expected_close_date: date | None = None
    lead_id: UUID | None = None
    assigned_to_id: UUID | None = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, value: str) -> str:
        if value not in DEAL_STAGES:
            raise ValueError(f"Stage must be one of: {', '.join(DEAL_STAGES)}")
        return value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        return value.upper()


class DealUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    stage: str | None = None
    value: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    expected_close_date: date | None = None
    lead_id: UUID | None = None
    assigned_to_id: UUID | None = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, value: str | None) -> str | None:
        if value is not None and value not in DEAL_STAGES:
            raise ValueError(f"Stage must be one of: {', '.join(DEAL_STAGES)}")
        return value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class DealMove(BaseModel):
    stage: str
    position: int = Field(ge=0)

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, value: str) -> str:
        if value not in DEAL_STAGES:
            raise ValueError(f"Stage must be one of: {', '.join(DEAL_STAGES)}")
        return value


class DealAssignee(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str


class DealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    title: str
    description: str | None
    stage: str
    position: int
    value: Decimal | None
    currency: str
    expected_close_date: date | None
    lead_id: UUID | None
    assigned_to_id: UUID | None
    assigned_to: DealAssignee | None = None
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None


class DealStageColumn(BaseModel):
    slug: str
    label: str
    deals: list[DealResponse]


class DealBoardResponse(BaseModel):
    stages: list[DealStageColumn]
    total: int


class DealMetaResponse(BaseModel):
    stages: list[dict[str, str]]
