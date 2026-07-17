import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Legacy + system activity_type values (kept for backward compatibility).
ACTIVITY_TYPES = (
    "call",
    "meeting",
    "email",
    "note",
    "task_update",
    "lead_update",
    "deal_update",
    "deal_created",
    "deal_moved",
    "deal_updated",
    "deal_deleted",
    "deal_won",
    "deal_lost",
    "company_created",
    "company_updated",
    "company_deleted",
    "contact_created",
    "contact_updated",
    "contact_deleted",
    "lead_created",
    "lead_assigned",
    "lead_converted",
    "lead_deleted",
    "deal_stage_changed",
    "task_created",
    "task_completed",
    "task_reopened",
    "task_deleted",
    "note_added",
    "note_edited",
    "user_login",
    "user_invited",
    "password_reset",
    "ticket_created",
    "ticket_updated",
    "ticket_assigned",
    "ticket_escalated",
    "ticket_resolved",
    "ticket_closed",
    "ticket_reopened",
    "ticket_archived",
    "ticket_deleted",
    "ticket_replied",
    "ticket_merged",
    "ticket_split",
    "chat_started",
    "chat_resolved",
)

ENTITY_TYPES = ("lead", "contact", "deal", "company", "task", "user", "tenant", "ticket", "chat")


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        Index("ix_activities_tenant_id", "tenant_id"),
        Index("ix_activities_tenant_created_at", "tenant_id", "created_at"),
        Index("ix_activities_tenant_entity", "tenant_id", "entity_type", "entity_id"),
        Index("ix_activities_tenant_type", "tenant_id", "activity_type"),
        Index("ix_activities_tenant_action", "tenant_id", "action"),
        Index("ix_activities_tenant_actor", "tenant_id", "created_by_id"),
        Index("ix_activities_tenant_archived", "tenant_id", "archived_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    activity_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="activities")
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
