"""Pydantic schemas for enterprise support & service desk (Phase 19)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.portal import TICKET_CATEGORIES as PORTAL_TICKET_CATEGORIES
from app.models.portal import TICKET_PRIORITIES as PORTAL_TICKET_PRIORITIES
from app.models.portal import TICKET_STATUSES as PORTAL_TICKET_STATUSES
from app.models.support import (
    CHAT_MESSAGE_TYPES,
    CHAT_STATUSES,
    ESCALATION_LEVELS,
    FEEDBACK_TYPES,
    KB_ARTICLE_STATUSES,
    KB_CONTENT_TYPES,
    TICKET_CHANNELS,
    TICKET_PRIORITIES,
    TICKET_SOURCES,
    TICKET_STATUSES,
)


# --- Refs ---


class UserRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr


class ContactRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    email: str | None = None


class CompanyRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_name: str


# --- Ticket create / update ---


class TicketCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1, max_length=8000)
    priority: str = Field(default="medium")
    category: str = Field(default="general")
    channel: str = Field(default="internal")
    contact_id: UUID | None = None
    company_id: UUID | None = None
    assigned_to_id: UUID | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("subject", "description", mode="before")
    @classmethod
    def strip_strings(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        if value not in TICKET_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(TICKET_PRIORITIES)}")
        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in PORTAL_TICKET_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(PORTAL_TICKET_CATEGORIES)}")
        return value

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, value: str) -> str:
        if value not in TICKET_CHANNELS:
            raise ValueError(f"Channel must be one of: {', '.join(TICKET_CHANNELS)}")
        return value


class TicketUpdate(BaseModel):
    subject: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=8000)
    status: str | None = None
    priority: str | None = None
    category: str | None = None
    channel: str | None = None
    contact_id: UUID | None = None
    company_id: UUID | None = None
    assigned_to_id: UUID | None = None
    escalation_level: str | None = None
    tags: list[str] | None = None
    sentiment: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in TICKET_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(TICKET_STATUSES)}")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str | None) -> str | None:
        if value is not None and value not in TICKET_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(TICKET_PRIORITIES)}")
        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str | None) -> str | None:
        if value is not None and value not in PORTAL_TICKET_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(PORTAL_TICKET_CATEGORIES)}")
        return value

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, value: str | None) -> str | None:
        if value is not None and value not in TICKET_CHANNELS:
            raise ValueError(f"Channel must be one of: {', '.join(TICKET_CHANNELS)}")
        return value

    @field_validator("escalation_level")
    @classmethod
    def validate_escalation_level(cls, value: str | None) -> str | None:
        if value is not None and value not in ESCALATION_LEVELS:
            raise ValueError(f"Escalation level must be one of: {', '.join(ESCALATION_LEVELS)}")
        return value


class TicketAssign(BaseModel):
    assigned_to_id: UUID


class TicketEscalate(BaseModel):
    escalation_level: str = Field(default="level_2")
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("escalation_level")
    @classmethod
    def validate_escalation_level(cls, value: str) -> str:
        if value not in ESCALATION_LEVELS:
            raise ValueError(f"Escalation level must be one of: {', '.join(ESCALATION_LEVELS)}")
        return value


class TicketMerge(BaseModel):
    source_ticket_id: UUID


class TicketSplit(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1, max_length=8000)


class TicketBulkAction(BaseModel):
    ticket_ids: list[UUID] = Field(min_length=1, max_length=100)
    action: str = Field(pattern="^(assign|close|archive|escalate|priority)$")
    assigned_to_id: UUID | None = None
    priority: str | None = None
    escalation_level: str | None = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str | None) -> str | None:
        if value is not None and value not in TICKET_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(TICKET_PRIORITIES)}")
        return value

    @field_validator("escalation_level")
    @classmethod
    def validate_escalation_level(cls, value: str | None) -> str | None:
        if value is not None and value not in ESCALATION_LEVELS:
            raise ValueError(f"Escalation level must be one of: {', '.join(ESCALATION_LEVELS)}")
        return value


# --- Replies ---


class TicketReplyCreate(BaseModel):
    body: str = Field(min_length=1, max_length=8000)
    is_internal: bool = False


class TicketReplyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ticket_id: UUID
    author_type: str
    body: str
    is_internal: bool
    is_ai_generated: bool
    staff_user_id: UUID | None
    portal_user_id: UUID | None
    author_name: str | None = None
    created_at: datetime


# --- Ticket responses ---


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    ticket_number: str | None
    subject: str
    description: str
    status: str
    priority: str
    category: str
    channel: str
    source: str
    escalation_level: str
    assigned_to_id: UUID | None
    assigned_to: UserRef | None = None
    contact_id: UUID | None
    contact: ContactRef | None = None
    company_id: UUID | None
    company: CompanyRef | None = None
    portal_user_id: UUID | None
    created_by_id: UUID | None
    sla_policy_id: UUID | None
    first_response_at: datetime | None
    response_due_at: datetime | None
    resolution_due_at: datetime | None
    escalation_due_at: datetime | None
    sla_breached: bool
    sentiment: str | None
    tags: list
    parent_ticket_id: UUID | None
    merged_into_id: UUID | None
    is_archived: bool
    resolved_at: datetime | None
    closed_at: datetime | None
    last_customer_reply_at: datetime | None
    last_agent_reply_at: datetime | None
    csat_score: int | None
    reply_count: int = 0
    created_at: datetime
    updated_at: datetime


class TicketDetailResponse(TicketResponse):
    replies: list[TicketReplyResponse] = Field(default_factory=list)


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TicketMetaResponse(BaseModel):
    statuses: list[str]
    priorities: list[str]
    channels: list[str]
    sources: list[str]
    escalation_levels: list[str]
    categories: list[str]


# --- Dashboard & analytics ---


class AgentPerformanceItem(BaseModel):
    user_id: UUID
    full_name: str
    tickets_assigned: int
    tickets_resolved: int
    avg_response_minutes: float
    avg_resolution_minutes: float
    csat_avg: float


class SupportDashboardResponse(BaseModel):
    today_tickets: int
    open_tickets: int
    pending_tickets: int
    resolved_tickets: int
    overdue_tickets: int
    sla_violations: int
    avg_response_minutes: float
    avg_resolution_minutes: float
    csat_score: float
    agent_performance: list[AgentPerformanceItem]
    recent_tickets: list[TicketResponse]
    recent_chats: list["ChatConversationResponse"]


class VolumeByDayItem(BaseModel):
    date: str
    count: int


class AgentLeaderboardItem(BaseModel):
    user_id: UUID
    full_name: str
    tickets_resolved: int
    avg_resolution_minutes: float
    csat_avg: float


class SlaPerformanceItem(BaseModel):
    priority: str
    met: int
    breached: int
    compliance_rate: float


class CsatTrendItem(BaseModel):
    date: str
    score: float
    count: int


class SupportAnalyticsResponse(BaseModel):
    volume_by_day: list[VolumeByDayItem]
    resolution_rate: float
    agent_leaderboard: list[AgentLeaderboardItem]
    sla_performance: list[SlaPerformanceItem]
    csat_trend: list[CsatTrendItem]


# --- SLA ---


class SlaPolicyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    priority: str = Field(default="medium")
    channel: str | None = None
    response_minutes: int = Field(default=60, ge=1)
    resolution_minutes: int = Field(default=480, ge=1)
    escalation_minutes: int = Field(default=240, ge=1)
    escalate_to_level: str = Field(default="level_2")
    is_active: bool = True
    is_default: bool = False

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        if value not in TICKET_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(TICKET_PRIORITIES)}")
        return value

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, value: str | None) -> str | None:
        if value is not None and value not in TICKET_CHANNELS:
            raise ValueError(f"Channel must be one of: {', '.join(TICKET_CHANNELS)}")
        return value

    @field_validator("escalate_to_level")
    @classmethod
    def validate_escalate_to_level(cls, value: str) -> str:
        if value not in ESCALATION_LEVELS:
            raise ValueError(f"Escalation level must be one of: {', '.join(ESCALATION_LEVELS)}")
        return value


class SlaPolicyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    priority: str | None = None
    channel: str | None = None
    response_minutes: int | None = Field(default=None, ge=1)
    resolution_minutes: int | None = Field(default=None, ge=1)
    escalation_minutes: int | None = Field(default=None, ge=1)
    escalate_to_level: str | None = None
    is_active: bool | None = None
    is_default: bool | None = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str | None) -> str | None:
        if value is not None and value not in TICKET_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(TICKET_PRIORITIES)}")
        return value

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, value: str | None) -> str | None:
        if value is not None and value not in TICKET_CHANNELS:
            raise ValueError(f"Channel must be one of: {', '.join(TICKET_CHANNELS)}")
        return value

    @field_validator("escalate_to_level")
    @classmethod
    def validate_escalate_to_level(cls, value: str | None) -> str | None:
        if value is not None and value not in ESCALATION_LEVELS:
            raise ValueError(f"Escalation level must be one of: {', '.join(ESCALATION_LEVELS)}")
        return value


class SlaPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    description: str | None
    priority: str
    channel: str | None
    response_minutes: int
    resolution_minutes: int
    escalation_minutes: int
    escalate_to_level: str
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime


class SlaPolicyListResponse(BaseModel):
    items: list[SlaPolicyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Knowledge base ---


class KnowledgeArticleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    summary: str | None = Field(default=None, max_length=500)
    category: str = Field(default="general")
    category_id: UUID | None = None
    content_type: str = Field(default="article")
    tags: list[str] = Field(default_factory=list)
    video_url: str | None = None
    status: str = Field(default="draft")

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, value: str) -> str:
        if value not in KB_CONTENT_TYPES:
            raise ValueError(f"Content type must be one of: {', '.join(KB_CONTENT_TYPES)}")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in KB_ARTICLE_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(KB_ARTICLE_STATUSES)}")
        return value


class KnowledgeArticleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = Field(default=None, min_length=1)
    summary: str | None = Field(default=None, max_length=500)
    category: str | None = None
    category_id: UUID | None = None
    content_type: str | None = None
    tags: list[str] | None = None
    video_url: str | None = None
    status: str | None = None
    change_note: str | None = Field(default=None, max_length=500)

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, value: str | None) -> str | None:
        if value is not None and value not in KB_CONTENT_TYPES:
            raise ValueError(f"Content type must be one of: {', '.join(KB_CONTENT_TYPES)}")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in KB_ARTICLE_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(KB_ARTICLE_STATUSES)}")
        return value


class KnowledgeArticleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    title: str
    slug: str
    summary: str | None
    body: str
    category: str
    category_id: UUID | None
    content_type: str
    status: str
    tags: list
    video_url: str | None
    version: int
    is_published: bool
    view_count: int
    helpful_count: int
    not_helpful_count: int
    created_by_id: UUID | None
    updated_by_id: UUID | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class KnowledgeArticleListResponse(BaseModel):
    items: list[KnowledgeArticleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class KnowledgeCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    parent_id: UUID | None = None
    icon: str = Field(default="book", max_length=50)
    sort_order: int = 0


class KnowledgeCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    parent_id: UUID | None = None
    icon: str | None = Field(default=None, max_length=50)
    sort_order: int | None = None
    is_active: bool | None = None


class KnowledgeCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    slug: str
    description: str | None
    parent_id: UUID | None
    icon: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# --- Chat ---


class ChatConversationCreate(BaseModel):
    contact_id: UUID | None = None
    company_id: UUID | None = None
    visitor_name: str | None = Field(default=None, max_length=150)
    visitor_email: str | None = Field(default=None, max_length=320)
    channel: str = Field(default="live_chat")
    ticket_id: UUID | None = None

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, value: str) -> str:
        if value not in TICKET_CHANNELS:
            raise ValueError(f"Channel must be one of: {', '.join(TICKET_CHANNELS)}")
        return value


class ChatMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=8000)
    message_type: str = Field(default="text")
    is_internal: bool = False

    @field_validator("message_type")
    @classmethod
    def validate_message_type(cls, value: str) -> str:
        if value not in CHAT_MESSAGE_TYPES:
            raise ValueError(f"Message type must be one of: {', '.join(CHAT_MESSAGE_TYPES)}")
        return value


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    author_type: str
    author_id: UUID | None
    author_name: str | None
    message_type: str
    body: str
    is_internal: bool
    created_at: datetime


class ChatConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    ticket_id: UUID | None
    contact_id: UUID | None
    company_id: UUID | None
    visitor_name: str | None
    visitor_email: str | None
    channel: str
    status: str
    assigned_to_id: UUID | None
    assigned_to: UserRef | None = None
    rating: int | None
    rating_comment: str | None
    started_at: datetime | None
    ended_at: datetime | None
    last_message_at: datetime | None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime


class ChatListResponse(BaseModel):
    items: list[ChatConversationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Feedback ---


class FeedbackCreate(BaseModel):
    ticket_id: UUID | None = None
    conversation_id: UUID | None = None
    contact_id: UUID | None = None
    agent_id: UUID | None = None
    feedback_type: str = Field(default="csat")
    score: int = Field(ge=1, le=10)
    comment: str | None = Field(default=None, max_length=2000)
    source: str = Field(default="ticket")

    @field_validator("feedback_type")
    @classmethod
    def validate_feedback_type(cls, value: str) -> str:
        if value not in FEEDBACK_TYPES:
            raise ValueError(f"Feedback type must be one of: {', '.join(FEEDBACK_TYPES)}")
        return value


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    ticket_id: UUID | None
    conversation_id: UUID | None
    contact_id: UUID | None
    agent_id: UUID | None
    feedback_type: str
    score: int
    comment: str | None
    source: str
    created_at: datetime


class FeedbackListResponse(BaseModel):
    items: list[FeedbackResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- AI assist ---


class AiSupportAssistRequest(BaseModel):
    assist_type: str = Field(
        default="all",
        pattern="^(all|reply|classification|sentiment|summary|priority|escalate|knowledge)$",
    )


class AiKnowledgeSuggestion(BaseModel):
    id: UUID
    title: str
    slug: str
    relevance_score: float


class AiSupportAssistResponse(BaseModel):
    reply_suggestion: str | None = None
    classification: str | None = None
    sentiment: str | None = None
    summary: str | None = None
    priority_suggestion: str | None = None
    escalate_recommendation: bool = False
    escalate_reason: str | None = None
    knowledge_suggestions: list[AiKnowledgeSuggestion] = Field(default_factory=list)


SupportDashboardResponse.model_rebuild()
