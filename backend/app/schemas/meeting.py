from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.meeting import (
    ATTENDANCE_STATUSES,
    MEETING_PRIORITIES,
    MEETING_STATUSES,
    MEETING_TYPES,
    PARTICIPANT_ROLES,
    REMINDER_METHODS,
)


class UserSummary(BaseModel):
    id: UUID
    full_name: str
    email: str


class MeetingParticipantInput(BaseModel):
    user_id: UUID
    role: str = Field(default="attendee", max_length=30)
    attendance_status: str = Field(default="invited", max_length=30)

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in PARTICIPANT_ROLES:
            raise ValueError(f"role must be one of: {', '.join(PARTICIPANT_ROLES)}")
        return normalized

    @field_validator("attendance_status")
    @classmethod
    def validate_attendance(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ATTENDANCE_STATUSES:
            raise ValueError(f"attendance_status must be one of: {', '.join(ATTENDANCE_STATUSES)}")
        return normalized


class MeetingReminderInput(BaseModel):
    remind_before_minutes: int = Field(default=15, ge=0, le=10080)
    method: str = Field(default="in_app", max_length=20)

    @field_validator("method")
    @classmethod
    def validate_method(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in REMINDER_METHODS:
            raise ValueError(f"method must be one of: {', '.join(REMINDER_METHODS)}")
        return normalized


class MeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10000)
    agenda: str | None = Field(default=None, max_length=10000)
    notes: str | None = Field(default=None, max_length=10000)
    meeting_type: str = Field(default="client_meeting", max_length=50)
    status: str = Field(default="scheduled", max_length=30)
    priority: str = Field(default="medium", max_length=20)
    start_datetime: datetime
    end_datetime: datetime
    timezone: str = Field(default="UTC", max_length=64)
    location: str | None = Field(default=None, max_length=500)
    meeting_url: str | None = Field(default=None, max_length=500)
    company_id: UUID | None = None
    contact_id: UUID | None = None
    lead_id: UUID | None = None
    deal_id: UUID | None = None
    task_id: UUID | None = None
    organizer_id: UUID | None = None
    recurrence_rule: dict | None = None
    metadata: dict | None = None
    participants: list[MeetingParticipantInput] = Field(default_factory=list)
    reminders: list[MeetingReminderInput] = Field(default_factory=list)

    @field_validator("title", "description", "agenda", "notes", "location", "meeting_url", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("meeting_type")
    @classmethod
    def validate_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in MEETING_TYPES:
            raise ValueError(f"meeting_type must be one of: {', '.join(MEETING_TYPES)}")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in MEETING_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(MEETING_STATUSES)}")
        return normalized

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in MEETING_PRIORITIES:
            raise ValueError(f"priority must be one of: {', '.join(MEETING_PRIORITIES)}")
        return normalized

    @model_validator(mode="after")
    def validate_range(self) -> "MeetingCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        return self


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=10000)
    agenda: str | None = Field(default=None, max_length=10000)
    notes: str | None = Field(default=None, max_length=10000)
    outcome: str | None = Field(default=None, max_length=10000)
    meeting_type: str | None = Field(default=None, max_length=50)
    status: str | None = Field(default=None, max_length=30)
    priority: str | None = Field(default=None, max_length=20)
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    timezone: str | None = Field(default=None, max_length=64)
    location: str | None = Field(default=None, max_length=500)
    meeting_url: str | None = Field(default=None, max_length=500)
    company_id: UUID | None = None
    contact_id: UUID | None = None
    lead_id: UUID | None = None
    deal_id: UUID | None = None
    task_id: UUID | None = None
    organizer_id: UUID | None = None
    recurrence_rule: dict | None = None
    metadata: dict | None = None
    participants: list[MeetingParticipantInput] | None = None
    reminders: list[MeetingReminderInput] | None = None

    @field_validator("meeting_type")
    @classmethod
    def validate_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in MEETING_TYPES:
            raise ValueError(f"meeting_type must be one of: {', '.join(MEETING_TYPES)}")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in MEETING_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(MEETING_STATUSES)}")
        return normalized

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in MEETING_PRIORITIES:
            raise ValueError(f"priority must be one of: {', '.join(MEETING_PRIORITIES)}")
        return normalized


class MeetingReschedule(BaseModel):
    start_datetime: datetime
    end_datetime: datetime
    timezone: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def validate_range(self) -> "MeetingReschedule":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        return self


class MeetingStatusUpdate(BaseModel):
    status: str = Field(max_length=30)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in MEETING_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(MEETING_STATUSES)}")
        return normalized


class MeetingParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    role: str
    attendance_status: str
    user: UserSummary | None = None


class MeetingReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    remind_before_minutes: int
    method: str


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    title: str
    description: str | None
    agenda: str | None
    notes: str | None
    outcome: str | None
    meeting_type: str
    status: str
    priority: str
    start_datetime: datetime
    end_datetime: datetime
    timezone: str
    location: str | None
    meeting_url: str | None
    company_id: UUID | None
    contact_id: UUID | None
    lead_id: UUID | None
    deal_id: UUID | None
    task_id: UUID | None
    organizer_id: UUID | None
    organizer: UserSummary | None = None
    created_by_id: UUID | None
    created_by: UserSummary | None = None
    updated_by_id: UUID | None
    recurrence_rule: dict | None
    metadata: dict | None = Field(default=None, validation_alias="meeting_metadata")
    activity_id: UUID | None
    participants: list[MeetingParticipantResponse] = Field(default_factory=list)
    reminders: list[MeetingReminderResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class MeetingListResponse(BaseModel):
    items: list[MeetingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CalendarEventResponse(BaseModel):
    id: UUID
    title: str
    meeting_type: str
    status: str
    priority: str
    start_datetime: datetime
    end_datetime: datetime
    location: str | None
    meeting_url: str | None
    company_id: UUID | None
    contact_id: UUID | None
    lead_id: UUID | None
    deal_id: UUID | None
    organizer: UserSummary | None = None
    participant_count: int = 0


class CalendarResponse(BaseModel):
    items: list[CalendarEventResponse]
    start: datetime
    end: datetime


class MeetingStatisticsResponse(BaseModel):
    meetings_today: int
    meetings_this_week: int
    meetings_this_month: int
    completed_meetings: int
    cancelled_meetings: int
    upcoming_meetings: int
    overdue_meetings: int
    upcoming_calls: int
    upcoming_demos: int
