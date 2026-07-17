"""Customer self-service portal models."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

PORTAL_USER_STATUSES = ("active", "suspended", "invited")

# Enterprise statuses/priorities — keep portal-compatible values.
TICKET_STATUSES = (
    "new",
    "open",
    "assigned",
    "waiting_customer",
    "in_progress",
    "escalated",
    "resolved",
    "closed",
)
TICKET_PRIORITIES = ("critical", "high", "medium", "low", "urgent")
TICKET_CATEGORIES = ("general", "billing", "technical", "account", "documents", "deals", "product", "other")

INVOICE_STATUSES = ("draft", "sent", "paid", "overdue", "cancelled")

PORTAL_AUDIT_ACTIONS = (
    "login",
    "logout",
    "profile_update",
    "document_download",
    "document_upload",
    "ticket_created",
    "ticket_reply",
    "deal_view",
    "meeting_join",
)


class CustomerPortalUser(Base, TimestampMixin):
    __tablename__ = "customer_portal_users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_portal_users_tenant_email"),
        Index("ix_portal_users_tenant", "tenant_id"),
        Index("ix_portal_users_contact", "tenant_id", "contact_id"),
        Index("ix_portal_users_company", "tenant_id", "company_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_title: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    contact: Mapped["Contact"] = relationship(foreign_keys=[contact_id])
    company: Mapped["Company | None"] = relationship(foreign_keys=[company_id])
    sessions: Mapped[list["PortalSession"]] = relationship(back_populates="portal_user")


class PortalSession(Base):
    __tablename__ = "portal_sessions"
    __table_args__ = (
        Index("ix_portal_sessions_user", "portal_user_id"),
        Index("ix_portal_sessions_hash", "token_hash"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portal_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_portal_users.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    portal_user: Mapped["CustomerPortalUser"] = relationship(back_populates="sessions")


class SupportTicket(Base, TimestampMixin):
    __tablename__ = "support_tickets"
    __table_args__ = (
        Index("ix_support_tickets_tenant", "tenant_id"),
        Index("ix_support_tickets_portal_user", "tenant_id", "portal_user_id"),
        Index("ix_support_tickets_status", "tenant_id", "status"),
        Index("ix_support_tickets_assignee", "tenant_id", "assigned_to_id"),
        Index("ix_support_tickets_priority", "tenant_id", "priority"),
        Index("ix_support_tickets_channel", "tenant_id", "channel"),
        Index("ix_support_tickets_number", "tenant_id", "ticket_number"),
        Index("ix_support_tickets_sla", "tenant_id", "sla_breached"),
        Index("ix_support_tickets_archived", "tenant_id", "is_archived"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    portal_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_portal_users.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    ticket_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="new")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="general")
    channel: Mapped[str] = mapped_column(String(30), nullable=False, default="portal")
    source: Mapped[str] = mapped_column(String(30), nullable=False, default="portal")
    escalation_level: Mapped[str] = mapped_column(String(30), nullable=False, default="level_1")
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    sla_policy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sla_policies.id", ondelete="SET NULL"), nullable=True
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ticket_categories.id", ondelete="SET NULL"), nullable=True
    )
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    response_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalation_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sla_breached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sentiment: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    merged_into_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True
    )
    parent_ticket_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_customer_reply_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_agent_reply_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    csat_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extra_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    replies: Mapped[list["TicketReply"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")


class TicketReply(Base, TimestampMixin):
    __tablename__ = "ticket_replies"
    __table_args__ = (Index("ix_ticket_replies_ticket", "ticket_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    author_type: Mapped[str] = mapped_column(String(20), nullable=False)  # portal | staff | system
    portal_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_portal_users.id", ondelete="SET NULL"), nullable=True
    )
    staff_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    ticket: Mapped["SupportTicket"] = relationship(back_populates="replies")


class Announcement(Base, TimestampMixin):
    __tablename__ = "portal_announcements"
    __table_args__ = (
        Index("ix_portal_announcements_tenant", "tenant_id"),
        Index("ix_portal_announcements_published", "tenant_id", "is_published"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class KnowledgeArticle(Base, TimestampMixin):
    __tablename__ = "knowledge_articles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_knowledge_articles_tenant_slug"),
        Index("ix_knowledge_articles_tenant", "tenant_id"),
        Index("ix_knowledge_articles_category", "tenant_id", "category"),
        Index("ix_knowledge_articles_status", "tenant_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge_categories.id", ondelete="SET NULL"), nullable=True
    )
    content_type: Mapped[str] = mapped_column(String(20), nullable=False, default="article")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="published")
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    video_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    helpful_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    not_helpful_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PortalInvoice(Base, TimestampMixin):
    __tablename__ = "portal_invoices"
    __table_args__ = (
        Index("ix_portal_invoices_tenant", "tenant_id"),
        Index("ix_portal_invoices_company", "tenant_id", "company_id"),
        Index("ix_portal_invoices_contact", "tenant_id", "contact_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    deal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.id", ondelete="SET NULL"), nullable=True
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="sent")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PortalNotification(Base):
    __tablename__ = "portal_notifications"
    __table_args__ = (
        Index("ix_portal_notifications_user", "portal_user_id"),
        Index("ix_portal_notifications_tenant_user", "tenant_id", "portal_user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    portal_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_portal_users.id", ondelete="CASCADE"), nullable=False
    )
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PortalAuditLog(Base):
    __tablename__ = "portal_audit_logs"
    __table_args__ = (
        Index("ix_portal_audit_logs_tenant", "tenant_id"),
        Index("ix_portal_audit_logs_user", "portal_user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    portal_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_portal_users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
