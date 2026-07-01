import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

EMAIL_STATUSES = ("draft", "scheduled", "sending", "sent", "failed", "received")
EMAIL_PRIORITIES = ("low", "normal", "high", "urgent")
EMAIL_FOLDERS = ("inbox", "sent", "drafts", "scheduled", "starred", "archive", "trash")
EMAIL_DIRECTIONS = ("outbound", "inbound")
RECIPIENT_TYPES = ("to", "cc", "bcc")
EMAIL_LOG_EVENTS = ("sent", "delivered", "opened", "clicked", "replied", "bounced", "failed", "scheduled", "draft_saved")
TEMPLATE_CATEGORIES = ("sales", "support", "follow_up", "welcome", "reminder", "marketing")


class EmailThread(Base, TimestampMixin):
    __tablename__ = "email_threads"
    __table_args__ = (
        Index("ix_email_threads_tenant_id", "tenant_id"),
        Index("ix_email_threads_tenant_last", "tenant_id", "last_message_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    emails: Mapped[list["Email"]] = relationship(back_populates="thread")


class EmailTemplate(Base, TimestampMixin):
    __tablename__ = "email_templates"
    __table_args__ = (
        Index("ix_email_templates_tenant_id", "tenant_id"),
        Index("ix_email_templates_tenant_category", "tenant_id", "category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="sales")
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    body_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_variables: Mapped[dict | None] = mapped_column("variables", JSONB, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])


class EmailUserSettings(Base, TimestampMixin):
    __tablename__ = "email_user_settings"
    __table_args__ = (UniqueConstraint("tenant_id", "user_id", name="uq_email_user_settings_tenant_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    signature_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_from_name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Email(Base, TimestampMixin):
    __tablename__ = "emails"
    __table_args__ = (
        Index("ix_emails_tenant_id", "tenant_id"),
        Index("ix_emails_tenant_folder", "tenant_id", "folder"),
        Index("ix_emails_tenant_status", "tenant_id", "status"),
        Index("ix_emails_tenant_sender", "tenant_id", "sender_id"),
        Index("ix_emails_tenant_thread", "tenant_id", "thread_id"),
        Index("ix_emails_tenant_scheduled", "tenant_id", "scheduled_at"),
        Index("ix_emails_tenant_contact", "tenant_id", "contact_id"),
        Index("ix_emails_tenant_deal", "tenant_id", "deal_id"),
        Index("ix_emails_tenant_lead", "tenant_id", "lead_id"),
        Index("ix_emails_tenant_company", "tenant_id", "company_id"),
        Index("ix_emails_tracking_token", "tracking_token", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    thread_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("email_threads.id", ondelete="SET NULL"), nullable=True
    )
    parent_email_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("emails.id", ondelete="SET NULL"), nullable=True
    )
    sender_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True
    )
    from_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    from_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="normal")
    folder: Mapped[str] = mapped_column(String(30), nullable=False, default="drafts")
    direction: Mapped[str] = mapped_column(String(20), nullable=False, default="outbound")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_starred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_important: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_attachments: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tracking_token: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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
    meeting_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True
    )
    activity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("activities.id", ondelete="SET NULL"), nullable=True
    )
    email_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    thread: Mapped["EmailThread | None"] = relationship(back_populates="emails")
    sender: Mapped["User | None"] = relationship(foreign_keys=[sender_id])
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
    template: Mapped["EmailTemplate | None"] = relationship()
    recipients: Mapped[list["EmailRecipient"]] = relationship(back_populates="email", cascade="all, delete-orphan")
    attachments: Mapped[list["EmailAttachment"]] = relationship(back_populates="email", cascade="all, delete-orphan")
    logs: Mapped[list["EmailLog"]] = relationship(back_populates="email", cascade="all, delete-orphan")


class EmailRecipient(Base):
    __tablename__ = "email_recipients"
    __table_args__ = (
        Index("ix_email_recipients_email", "email_id"),
        Index("ix_email_recipients_address", "email_address"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("emails.id", ondelete="CASCADE"), nullable=False
    )
    recipient_type: Mapped[str] = mapped_column(String(10), nullable=False)
    email_address: Mapped[str] = mapped_column(String(320), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    email: Mapped["Email"] = relationship(back_populates="recipients")
    contact: Mapped["Contact | None"] = relationship()


class EmailAttachment(Base):
    __tablename__ = "email_attachments"
    __table_args__ = (Index("ix_email_attachments_email", "email_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("emails.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    email: Mapped["Email"] = relationship(back_populates="attachments")


class EmailLog(Base):
    __tablename__ = "email_logs"
    __table_args__ = (
        Index("ix_email_logs_email", "email_id"),
        Index("ix_email_logs_event", "email_id", "event_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("emails.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    log_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    email: Mapped["Email"] = relationship(back_populates="logs")
