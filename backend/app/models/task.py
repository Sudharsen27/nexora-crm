import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

TASK_STATUSES = ("pending", "in_progress", "completed", "cancelled")
TASK_PRIORITIES = ("low", "medium", "high", "urgent")
TASK_ENTITY_TYPES = ("lead", "contact", "deal", "company")
TASK_SORT_FIELDS = ("title", "status", "priority", "due_date", "created_at", "updated_at")
KANBAN_STATUSES = ("pending", "in_progress", "completed")


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_tenant_id", "tenant_id"),
        Index("ix_tasks_tenant_status", "tenant_id", "status"),
        Index("ix_tasks_tenant_assigned", "tenant_id", "assigned_to_id"),
        Index("ix_tasks_tenant_due_date", "tenant_id", "due_date"),
        Index("ix_tasks_tenant_entity", "tenant_id", "entity_type", "entity_id"),
        Index("ix_tasks_tenant_priority", "tenant_id", "priority"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="tasks")
    assigned_to: Mapped["User | None"] = relationship(foreign_keys=[assigned_to_id])
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
