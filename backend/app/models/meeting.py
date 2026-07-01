import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

MEETING_TYPES = (
    "call",
    "online_meeting",
    "client_meeting",
    "demo",
    "sales_meeting",
    "follow_up",
    "internal_meeting",
    "presentation",
    "interview",
    "support",
)

MEETING_STATUSES = (
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "missed",
)

MEETING_PRIORITIES = ("low", "medium", "high", "urgent")

PARTICIPANT_ROLES = ("organizer", "attendee", "optional")

ATTENDANCE_STATUSES = ("invited", "accepted", "declined", "tentative", "attended", "no_show")

REMINDER_METHODS = ("in_app", "email", "push")


class Meeting(Base, TimestampMixin):
    __tablename__ = "meetings"
    __table_args__ = (
        Index("ix_meetings_tenant_id", "tenant_id"),
        Index("ix_meetings_tenant_start", "tenant_id", "start_datetime"),
        Index("ix_meetings_tenant_status", "tenant_id", "status"),
        Index("ix_meetings_tenant_type", "tenant_id", "meeting_type"),
        Index("ix_meetings_tenant_company", "tenant_id", "company_id"),
        Index("ix_meetings_tenant_contact", "tenant_id", "contact_id"),
        Index("ix_meetings_tenant_lead", "tenant_id", "lead_id"),
        Index("ix_meetings_tenant_deal", "tenant_id", "deal_id"),
        Index("ix_meetings_tenant_organizer", "tenant_id", "organizer_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    agenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_type: Mapped[str] = mapped_column(String(50), nullable=False, default="client_meeting")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="scheduled")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    meeting_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True
    )
    deal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deals.id", ondelete="SET NULL"), nullable=True
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    organizer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    recurrence_rule: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    meeting_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    activity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("activities.id", ondelete="SET NULL"), nullable=True
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="meetings")
    company: Mapped["Company | None"] = relationship(foreign_keys=[company_id])
    contact: Mapped["Contact | None"] = relationship(foreign_keys=[contact_id])
    lead: Mapped["Lead | None"] = relationship(foreign_keys=[lead_id])
    deal: Mapped["Deal | None"] = relationship(foreign_keys=[deal_id])
    task: Mapped["Task | None"] = relationship(foreign_keys=[task_id])
    organizer: Mapped["User | None"] = relationship(foreign_keys=[organizer_id])
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
    updated_by: Mapped["User | None"] = relationship(foreign_keys=[updated_by_id])
    participants: Mapped[list["MeetingParticipant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    reminders: Mapped[list["MeetingReminder"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"
    __table_args__ = (
        Index("ix_meeting_participants_meeting", "meeting_id"),
        Index("ix_meeting_participants_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="attendee")
    attendance_status: Mapped[str] = mapped_column(String(30), nullable=False, default="invited")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    meeting: Mapped["Meeting"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship(foreign_keys=[user_id])


class MeetingReminder(Base):
    __tablename__ = "meeting_reminders"
    __table_args__ = (Index("ix_meeting_reminders_meeting", "meeting_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    remind_before_minutes: Mapped[int] = mapped_column(nullable=False, default=15)
    method: Mapped[str] = mapped_column(String(20), nullable=False, default="in_app")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    meeting: Mapped["Meeting"] = relationship(back_populates="reminders")
