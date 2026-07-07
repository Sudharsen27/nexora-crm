"""Enterprise in-app notifications."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

NOTIFICATION_TYPES = (
    "lead_assigned",
    "lead_converted",
    "deal_created",
    "deal_won",
    "deal_lost",
    "deal_stage_changed",
    "task_assigned",
    "task_completed",
    "task_due_tomorrow",
    "meeting_scheduled",
    "meeting_reminder",
    "meeting_rescheduled",
    "meeting_cancelled",
    "meeting_completed",
    "meeting_started",
    "meeting_participant_added",
    "email_received",
    "email_delivered",
    "email_failed",
    "email_reply_received",
    "email_scheduled",
    "company_created",
    "contact_added",
    "note_added",
    "comment_mention",
    "user_invited",
    "password_changed",
    "password_reset",
    "login_new_device",
    "system_announcement",
    "workflow_success",
    "workflow_failed",
    "document_shared",
    "signature_requested",
    "signature_completed",
    "document_uploaded",
    "document_version_updated",
    "report_ready",
    "forecast_updated",
    "revenue_alert",
    "target_achieved",
    "goal_missed",
)

NOTIFICATION_PRIORITIES = ("low", "normal", "high", "urgent")

NOTIFICATION_CATEGORIES = {
    "deals": ("deal_created", "deal_won", "deal_lost", "deal_stage_changed"),
    "companies": ("company_created",),
    "contacts": ("contact_added",),
    "tasks": ("task_assigned", "task_completed", "task_due_tomorrow"),
    "meetings": (
        "meeting_scheduled",
        "meeting_reminder",
        "meeting_rescheduled",
        "meeting_cancelled",
        "meeting_completed",
        "meeting_started",
        "meeting_participant_added",
    ),
    "emails": (
        "email_received",
        "email_delivered",
        "email_failed",
        "email_reply_received",
        "email_scheduled",
    ),
    "notes": ("note_added", "comment_mention"),
    "documents": (
        "document_shared",
        "signature_requested",
        "signature_completed",
        "document_uploaded",
        "document_version_updated",
    ),
    "system": (
        "lead_assigned",
        "lead_converted",
        "user_invited",
        "password_changed",
        "password_reset",
        "login_new_device",
        "system_announcement",
    ),
}


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_tenant_user_created", "tenant_id", "user_id", "created_at"),
        Index("ix_notifications_tenant_user_read", "tenant_id", "user_id", "read"),
        Index("ix_notifications_tenant_user_archived", "tenant_id", "user_id", "archived_at"),
        Index("ix_notifications_dedup", "tenant_id", "user_id", "dedup_key", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="normal", nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    action_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    notification_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    dedup_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship()
    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    actor: Mapped["User | None"] = relationship(foreign_keys=[actor_id])
