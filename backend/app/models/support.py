"""Enterprise Customer Support & Service Desk models (Phase 19).

Extends portal SupportTicket / KnowledgeArticle with SLA, chat, feedback,
categories, and agent performance. Core ticket tables live in portal.py;
this module owns the enterprise support surface.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

if TYPE_CHECKING:
    pass

# ---------------------------------------------------------------------------
# Domain constants (enterprise + portal-compatible)
# ---------------------------------------------------------------------------

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

TICKET_CHANNELS = (
    "email",
    "live_chat",
    "whatsapp",
    "facebook",
    "instagram",
    "telegram",
    "sms",
    "phone",
    "portal",
    "api",
    "internal",
)

TICKET_SOURCES = ("portal", "staff", "email", "chat", "phone", "api", "social")

ESCALATION_LEVELS = (
    "level_1",
    "level_2",
    "level_3",
    "manager",
    "technical",
    "executive",
)

SLA_METRIC_TYPES = ("response", "resolution", "escalation")

CHAT_STATUSES = ("waiting", "active", "transferred", "resolved", "abandoned")

CHAT_MESSAGE_TYPES = ("text", "emoji", "attachment", "system", "rating")

FEEDBACK_TYPES = ("csat", "nps", "agent_rating", "review")

KB_ARTICLE_STATUSES = ("draft", "published", "archived")

KB_CONTENT_TYPES = ("article", "faq", "video")

OPEN_TICKET_STATUSES = ("new", "open", "assigned", "waiting_customer", "in_progress", "escalated")
RESOLVED_TICKET_STATUSES = ("resolved", "closed")


class TicketCategory(Base, TimestampMixin):
    __tablename__ = "ticket_categories"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_ticket_categories_tenant_slug"),
        Index("ix_ticket_categories_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(30), nullable=False, default="slate")
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="folder")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class SlaPolicy(Base, TimestampMixin):
    __tablename__ = "sla_policies"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_sla_policies_tenant_name"),
        Index("ix_sla_policies_tenant", "tenant_id"),
        Index("ix_sla_policies_tenant_active", "tenant_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    channel: Mapped[str | None] = mapped_column(String(30), nullable=True)
    response_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    resolution_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=480)
    escalation_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=240)
    escalate_to_level: Mapped[str] = mapped_column(String(30), nullable=False, default="level_2")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class TicketAttachment(Base, TimestampMixin):
    __tablename__ = "ticket_attachments"
    __table_args__ = (
        Index("ix_ticket_attachments_ticket", "ticket_id"),
        Index("ix_ticket_attachments_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False
    )
    reply_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ticket_replies.id", ondelete="SET NULL"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False, default="application/octet-stream")
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class KnowledgeCategory(Base, TimestampMixin):
    __tablename__ = "knowledge_categories"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_knowledge_categories_tenant_slug"),
        Index("ix_knowledge_categories_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge_categories.id", ondelete="SET NULL"), nullable=True
    )
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="book")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class KnowledgeArticleVersion(Base, TimestampMixin):
    __tablename__ = "knowledge_article_versions"
    __table_args__ = (
        UniqueConstraint("article_id", "version", name="uq_kb_article_versions"),
        Index("ix_kb_article_versions_article", "article_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    change_note: Mapped[str | None] = mapped_column(String(500), nullable=True)


class ChatConversation(Base, TimestampMixin):
    __tablename__ = "chat_conversations"
    __table_args__ = (
        Index("ix_chat_conversations_tenant", "tenant_id"),
        Index("ix_chat_conversations_status", "tenant_id", "status"),
        Index("ix_chat_conversations_agent", "tenant_id", "assigned_to_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    ticket_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    portal_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_portal_users.id", ondelete="SET NULL"), nullable=True
    )
    visitor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    visitor_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    channel: Mapped[str] = mapped_column(String(30), nullable=False, default="live_chat")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="waiting")
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    extra_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("ix_chat_messages_conversation", "conversation_id"),
        Index("ix_chat_messages_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False
    )
    author_type: Mapped[str] = mapped_column(String(20), nullable=False)  # visitor | agent | system
    author_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    author_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    message_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    body: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    conversation: Mapped["ChatConversation"] = relationship(back_populates="messages")


class CustomerFeedback(Base, TimestampMixin):
    __tablename__ = "customer_feedback"
    __table_args__ = (
        Index("ix_customer_feedback_tenant", "tenant_id"),
        Index("ix_customer_feedback_ticket", "ticket_id"),
        Index("ix_customer_feedback_type", "tenant_id", "feedback_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    ticket_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_conversations.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    feedback_type: Mapped[str] = mapped_column(String(30), nullable=False, default="csat")
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(30), nullable=False, default="ticket")


class AgentPerformance(Base, TimestampMixin):
    """Cached / rollup metrics per agent for support analytics."""

    __tablename__ = "agent_performance"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "period_key", name="uq_agent_performance_period"),
        Index("ix_agent_performance_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    period_key: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. 2026-07
    tickets_assigned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tickets_resolved: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tickets_escalated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_response_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    avg_resolution_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    csat_avg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    csat_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chat_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sla_met: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sla_breached: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
