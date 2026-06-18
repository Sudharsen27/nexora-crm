import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

ACTIVITY_TYPES = (
    "call",
    "meeting",
    "email",
    "note",
    "task_update",
    "lead_update",
    "deal_update",
)

ENTITY_TYPES = ("lead", "contact", "deal")


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        Index("ix_activities_tenant_id", "tenant_id"),
        Index("ix_activities_tenant_created_at", "tenant_id", "created_at"),
        Index("ix_activities_tenant_entity", "tenant_id", "entity_type", "entity_id"),
        Index("ix_activities_tenant_type", "tenant_id", "activity_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    activity_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="activities")
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
