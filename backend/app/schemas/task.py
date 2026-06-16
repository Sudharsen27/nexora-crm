from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.task import TASK_ENTITY_TYPES, TASK_PRIORITIES, TASK_STATUSES


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    status: str = Field(default="pending", max_length=30)
    priority: str = Field(default="medium", max_length=20)
    due_date: date | None = None
    assigned_to_id: UUID | None = None
    entity_type: str | None = Field(default=None, max_length=30)
    entity_id: UUID | None = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in TASK_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(TASK_STATUSES)}")
        return normalized

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in TASK_PRIORITIES:
            raise ValueError(f"priority must be one of: {', '.join(TASK_PRIORITIES)}")
        return normalized

    @field_validator("entity_type")
    @classmethod
    def validate_entity_type(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        normalized = value.strip().lower()
        if normalized not in TASK_ENTITY_TYPES:
            raise ValueError(f"entity_type must be one of: {', '.join(TASK_ENTITY_TYPES)}")
        return normalized


class TaskUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    status: str = Field(max_length=30)
    priority: str = Field(max_length=20)
    due_date: date | None = None
    assigned_to_id: UUID | None = None
    entity_type: str | None = Field(default=None, max_length=30)
    entity_id: UUID | None = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in TASK_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(TASK_STATUSES)}")
        return normalized

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in TASK_PRIORITIES:
            raise ValueError(f"priority must be one of: {', '.join(TASK_PRIORITIES)}")
        return normalized

    @field_validator("entity_type")
    @classmethod
    def validate_entity_type(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        normalized = value.strip().lower()
        if normalized not in TASK_ENTITY_TYPES:
            raise ValueError(f"entity_type must be one of: {', '.join(TASK_ENTITY_TYPES)}")
        return normalized


class TaskAssignee(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str


class TaskCreator(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    title: str
    description: str | None
    status: str
    priority: str
    due_date: date | None
    assigned_to_id: UUID | None
    assigned_to: TaskAssignee | None = None
    created_by_id: UUID | None
    created_by: TaskCreator | None = None
    entity_type: str | None
    entity_id: UUID | None
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int
    page: int
    page_size: int
    pages: int


class TaskStatusColumn(BaseModel):
    slug: str
    label: str
    tasks: list[TaskResponse]


class TaskBoardResponse(BaseModel):
    columns: list[TaskStatusColumn]
    total: int


class TaskAssigneeSummary(BaseModel):
    user_id: UUID
    full_name: str
    open_count: int
    overdue_count: int


class TaskDashboardSummary(BaseModel):
    my_open: int
    my_overdue: int
    my_due_today: int
    team_open: int
    team_overdue: int
    by_assignee: list[TaskAssigneeSummary]
