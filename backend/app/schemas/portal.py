"""Pydantic schemas for customer portal API."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


# --- Auth ---

class PortalRefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class PortalLoginRequest(BaseModel):
    tenant_slug: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PortalTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str | None = None
    tenant_slug: str
    tenant_name: str


class PortalUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    job_title: str | None
    phone: str | None
    contact_id: uuid.UUID
    company_id: uuid.UUID | None
    company_name: str | None
    tenant_slug: str
    tenant_name: str

    model_config = {"from_attributes": True}


class PortalProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    job_title: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=50)


class PortalCreateUserRequest(BaseModel):
    contact_id: uuid.UUID
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# --- Dashboard ---

class PortalKpiWidget(BaseModel):
    key: str
    label: str
    value: str | int
    hint: str | None = None


class PortalDashboardResponse(BaseModel):
    kpis: list[PortalKpiWidget]
    open_deals: list[PortalDealSummary]
    upcoming_meetings: list[PortalMeetingSummary]
    recent_documents: list[PortalDocumentSummary]
    recent_activities: list[PortalTimelineItem]
    announcements: list[PortalAnnouncementSummary]
    unread_notifications: int
    pending_signatures: int
    open_tickets: int
    outstanding_payments: int


# --- Deals ---

class PortalDealSummary(BaseModel):
    id: uuid.UUID
    title: str
    stage: str
    stage_label: str
    value: Decimal | None
    currency: str
    probability: int
    expected_close_date: date | None
    updated_at: datetime


class PortalDealDetail(PortalDealSummary):
    description: str | None
    timeline: list[PortalTimelineItem]


# --- Documents ---

class PortalDocumentSummary(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    mime_type: str
    size_bytes: int
    current_version: int
    updated_at: datetime
    deal_id: uuid.UUID | None = None


class PortalDocumentDetail(PortalDocumentSummary):
    description: str | None
    versions: list[PortalDocumentVersion]


class PortalDocumentVersion(BaseModel):
    version_number: int
    filename: str
    size_bytes: int
    created_at: datetime


class PortalDocumentUploadMeta(BaseModel):
    name: str = Field(min_length=1, max_length=500)
    description: str | None = None
    deal_id: uuid.UUID | None = None


# --- Meetings ---

class PortalMeetingSummary(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    meeting_type: str
    start_datetime: datetime
    end_datetime: datetime
    location: str | None
    meeting_url: str | None


class PortalMeetingRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    preferred_start: datetime
    preferred_end: datetime
    meeting_type: str = "client_meeting"


# --- Support ---

class PortalTicketCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1, max_length=8000)
    priority: str = "medium"
    category: str = "general"


class PortalTicketReplyCreate(BaseModel):
    body: str = Field(min_length=1, max_length=8000)


class PortalTicketReplyResponse(BaseModel):
    id: uuid.UUID
    author_type: str
    author_name: str
    body: str
    created_at: datetime


class PortalTicketSummary(BaseModel):
    id: uuid.UUID
    subject: str
    status: str
    priority: str
    category: str
    created_at: datetime
    updated_at: datetime
    reply_count: int


class PortalTicketDetail(PortalTicketSummary):
    description: str
    replies: list[PortalTicketReplyResponse]


# --- Knowledge & announcements ---

class PortalAnnouncementSummary(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    published_at: datetime | None
    created_at: datetime


class PortalKnowledgeSummary(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    summary: str | None
    category: str
    view_count: int


class PortalKnowledgeDetail(PortalKnowledgeSummary):
    body: str


# --- Notifications & timeline ---

class PortalNotificationItem(BaseModel):
    id: uuid.UUID
    notification_type: str
    title: str
    body: str | None
    link: str | None
    is_read: bool
    created_at: datetime


class PortalTimelineItem(BaseModel):
    id: str
    event_type: str
    title: str
    detail: str | None
    occurred_at: datetime
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None


# --- Invoices ---

class PortalInvoiceSummary(BaseModel):
    id: uuid.UUID
    invoice_number: str
    amount: Decimal
    currency: str
    status: str
    due_date: date | None
    deal_id: uuid.UUID | None
    document_id: uuid.UUID | None


# --- AI ---

class PortalAiChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=32000)


class PortalAiChatRequest(BaseModel):
    messages: list[PortalAiChatMessage] = Field(min_length=1, max_length=30)
