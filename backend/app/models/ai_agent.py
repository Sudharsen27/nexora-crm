"""Enterprise AI Multi-Agent Platform models (Phase 17)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

AGENT_SLUGS = (
    "sales",
    "support",
    "marketing",
    "executive",
    "operations",
    "workflow",
    "meeting",
    "knowledge",
)

AGENT_STATUSES = ("idle", "running", "paused", "error", "disabled")
EXECUTION_STATUSES = ("pending", "running", "completed", "failed", "cancelled")
TASK_STATUSES = ("queued", "running", "completed", "failed", "cancelled")
RECOMMENDATION_STATUSES = ("pending", "accepted", "dismissed", "expired")
INSIGHT_SEVERITIES = ("info", "low", "medium", "high", "critical")

AGENT_CATALOG: list[dict] = [
    {
        "slug": "sales",
        "name": "Sales Agent",
        "description": "Lead scoring, deal prediction, pipeline optimization, revenue forecast, and next-best actions.",
        "icon": "trending-up",
        "capabilities": [
            "lead_scoring",
            "deal_prediction",
            "pipeline_optimization",
            "revenue_forecast",
            "next_best_action",
            "cross_sell",
            "upsell",
            "follow_up_email",
            "proposal",
            "sales_summary",
            "stalled_deals",
        ],
    },
    {
        "slug": "support",
        "name": "Support Agent",
        "description": "Ticket classification, sentiment analysis, auto-replies, knowledge search, and customer health.",
        "icon": "headphones",
        "capabilities": [
            "ticket_classification",
            "sentiment_analysis",
            "auto_reply",
            "knowledge_search",
            "escalation",
            "customer_health",
            "conversation_summary",
        ],
    },
    {
        "slug": "marketing",
        "name": "Marketing Agent",
        "description": "Campaign suggestions, audience segmentation, email content, and lead source analysis.",
        "icon": "megaphone",
        "capabilities": [
            "campaign_suggestions",
            "audience_segmentation",
            "email_campaign",
            "social_content",
            "marketing_calendar",
            "lead_source_analysis",
            "campaign_performance",
        ],
    },
    {
        "slug": "executive",
        "name": "Executive Agent",
        "description": "Business summaries, daily/weekly/monthly reports, revenue analysis, and strategic recommendations.",
        "icon": "briefcase",
        "capabilities": [
            "executive_dashboard",
            "business_summary",
            "daily_report",
            "weekly_report",
            "monthly_report",
            "revenue_analysis",
            "department_performance",
            "risk_analysis",
            "strategic_recommendations",
        ],
    },
    {
        "slug": "operations",
        "name": "Operations Agent",
        "description": "Workflow monitoring, integration health, usage, duplicates, and performance suggestions.",
        "icon": "settings",
        "capabilities": [
            "workflow_monitoring",
            "integration_health",
            "database_health",
            "system_usage",
            "duplicate_detection",
            "storage_monitoring",
            "performance_suggestions",
        ],
    },
    {
        "slug": "workflow",
        "name": "Workflow Agent",
        "description": "Auto-create workflows, optimize automation, and recommend triggers.",
        "icon": "git-branch",
        "capabilities": [
            "create_workflows",
            "workflow_optimization",
            "workflow_recommendations",
            "trigger_suggestions",
            "automation_health",
        ],
    },
    {
        "slug": "meeting",
        "name": "Meeting Agent",
        "description": "Meeting summaries, action items, task assignment, insights, and calendar optimization.",
        "icon": "calendar",
        "capabilities": [
            "meeting_summary",
            "action_items",
            "assign_tasks",
            "meeting_insights",
            "follow_up",
            "calendar_optimization",
        ],
    },
    {
        "slug": "knowledge",
        "name": "Knowledge Agent",
        "description": "Search documents, emails, meetings, activities, CRM data, and answer company questions.",
        "icon": "book-open",
        "capabilities": [
            "search_documents",
            "search_emails",
            "search_meetings",
            "search_activities",
            "search_crm",
            "search_reports",
            "company_qa",
        ],
    },
]


class AiAgent(Base, TimestampMixin):
    __tablename__ = "ai_agents"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_ai_agents_tenant_slug"),
        Index("ix_ai_agents_tenant_status", "tenant_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="bot")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="idle")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    capabilities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    total_executions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_duration_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    executions: Mapped[list["AiAgentExecution"]] = relationship(back_populates="agent", cascade="all, delete-orphan")
    memories: Mapped[list["AiAgentMemory"]] = relationship(back_populates="agent", cascade="all, delete-orphan")
    tasks: Mapped[list["AiAgentTask"]] = relationship(back_populates="agent", cascade="all, delete-orphan")


class AiAgentExecution(Base, TimestampMixin):
    __tablename__ = "ai_agent_executions"
    __table_args__ = (
        Index("ix_ai_executions_tenant_agent", "tenant_id", "agent_id"),
        Index("ix_ai_executions_status", "tenant_id", "status"),
        Index("ix_ai_executions_created", "tenant_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="CASCADE"), nullable=False
    )
    triggered_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    input_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    output_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    orchestration_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    agent: Mapped["AiAgent"] = relationship(back_populates="executions")


class AiAgentMemory(Base, TimestampMixin):
    __tablename__ = "ai_agent_memory"
    __table_args__ = (
        Index("ix_ai_memory_tenant_agent", "tenant_id", "agent_id"),
        Index("ix_ai_memory_key", "tenant_id", "memory_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="CASCADE"), nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    memory_key: Mapped[str] = mapped_column(String(120), nullable=False)
    memory_type: Mapped[str] = mapped_column(String(40), nullable=False, default="context")
    content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    agent: Mapped["AiAgent | None"] = relationship(back_populates="memories")


class AiAgentTask(Base, TimestampMixin):
    __tablename__ = "ai_agent_tasks"
    __table_args__ = (
        Index("ix_ai_tasks_tenant_status", "tenant_id", "status"),
        Index("ix_ai_tasks_agent", "tenant_id", "agent_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    result: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    agent: Mapped["AiAgent"] = relationship(back_populates="tasks")


class AiConversation(Base, TimestampMixin):
    __tablename__ = "ai_conversations"
    __table_args__ = (
        Index("ix_ai_conversations_tenant_user", "tenant_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Conversation")
    messages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)


class AiRecommendation(Base, TimestampMixin):
    __tablename__ = "ai_recommendations"
    __table_args__ = (
        Index("ix_ai_recommendations_tenant_status", "tenant_id", "status"),
        Index("ix_ai_recommendations_agent", "tenant_id", "agent_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True
    )
    execution_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_agent_executions.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    action_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.8)


class AiInsight(Base, TimestampMixin):
    __tablename__ = "ai_insights"
    __table_args__ = (
        Index("ix_ai_insights_tenant", "tenant_id"),
        Index("ix_ai_insights_severity", "tenant_id", "severity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class AiUsage(Base, TimestampMixin):
    __tablename__ = "ai_usage"
    __table_args__ = (
        Index("ix_ai_usage_tenant_date", "tenant_id", "usage_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_agents.id", ondelete="SET NULL"), nullable=True
    )
    usage_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    executions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
