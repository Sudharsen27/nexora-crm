import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_super_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    memberships: Mapped[list["TenantMembership"]] = relationship(back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user")
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(back_populates="user")


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    memberships: Mapped[list["TenantMembership"]] = relationship(back_populates="tenant")
    roles: Mapped[list["Role"]] = relationship(back_populates="tenant")
    leads: Mapped[list["Lead"]] = relationship(back_populates="tenant")
    deals: Mapped[list["Deal"]] = relationship(back_populates="tenant")
    contacts: Mapped[list["Contact"]] = relationship(back_populates="tenant")
    companies: Mapped[list["Company"]] = relationship(back_populates="tenant")
    activities: Mapped[list["Activity"]] = relationship(back_populates="tenant")
    tasks: Mapped[list["Task"]] = relationship(back_populates="tenant")
    meetings: Mapped[list["Meeting"]] = relationship(back_populates="tenant")


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_roles_tenant_slug"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    tenant: Mapped["Tenant | None"] = relationship(back_populates="roles")
    permissions: Mapped[list["Permission"]] = relationship(
        secondary="role_permissions", back_populates="roles"
    )
    memberships: Mapped[list["TenantMembership"]] = relationship(back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    roles: Mapped[list["Role"]] = relationship(
        secondary="role_permissions", back_populates="permissions"
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True
    )


class TenantMembership(Base):
    __tablename__ = "tenant_memberships"
    __table_args__ = (UniqueConstraint("tenant_id", "user_id", name="uq_membership_tenant_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship(back_populates="memberships")
    role: Mapped["Role"] = relationship(back_populates="memberships")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="password_reset_tokens")


from app.models.lead import LEAD_SOURCES, LEAD_STATUSES, Lead  # noqa: E402, F401
from app.models.deal import DEAL_STAGES, DEAL_STAGE_LABELS, Deal  # noqa: E402, F401
from app.models.company import COMPANY_INDUSTRIES, COMPANY_SORT_FIELDS, Company  # noqa: E402, F401
from app.models.contact import CONTACT_SORT_FIELDS, Contact  # noqa: E402, F401
from app.models.activity import ACTIVITY_TYPES, ENTITY_TYPES, Activity  # noqa: E402, F401
from app.models.task import KANBAN_STATUSES, TASK_PRIORITIES, TASK_STATUSES, Task  # noqa: E402, F401
from app.models.notification import NOTIFICATION_TYPES, Notification  # noqa: E402, F401
from app.models.meeting import (  # noqa: E402, F401
    ATTENDANCE_STATUSES,
    MEETING_PRIORITIES,
    MEETING_STATUSES,
    MEETING_TYPES,
    PARTICIPANT_ROLES,
    REMINDER_METHODS,
    Meeting,
    MeetingParticipant,
    MeetingReminder,
)
from app.models.email import (  # noqa: E402, F401
    EMAIL_FOLDERS,
    EMAIL_LOG_EVENTS,
    EMAIL_PRIORITIES,
    EMAIL_STATUSES,
    TEMPLATE_CATEGORIES,
    Email,
    EmailAttachment,
    EmailLog,
    EmailRecipient,
    EmailTemplate,
    EmailThread,
    EmailUserSettings,
)
from app.models.workflow import (  # noqa: E402, F401
    CONDITION_OPERATORS,
    EXECUTION_STATUSES,
    NODE_TYPES,
    WORKFLOW_ACTIONS,
    WORKFLOW_STATUSES,
    WORKFLOW_TRIGGERS,
    Workflow,
    WorkflowConnection,
    WorkflowExecution,
    WorkflowLog,
    WorkflowNode,
    WorkflowVersion,
)
from app.models.document import (  # noqa: E402, F401
    ALLOWED_MIME_TYPES,
    DOCUMENT_STATUSES,
    FOLDER_TYPES,
    Document,
    DocumentAuditLog,
    DocumentComment,
    DocumentFolder,
    DocumentShare,
    DocumentVersion,
    SignatureRequest,
    SignatureSigner,
)
from app.models.portal import (  # noqa: E402, F401
    INVOICE_STATUSES,
    PORTAL_AUDIT_ACTIONS,
    PORTAL_USER_STATUSES,
    TICKET_CATEGORIES,
    TICKET_PRIORITIES,
    TICKET_STATUSES,
    Announcement,
    CustomerPortalUser,
    KnowledgeArticle,
    PortalAuditLog,
    PortalInvoice,
    PortalNotification,
    PortalSession,
    SupportTicket,
    TicketReply,
)
from app.models.bi import (  # noqa: E402, F401
    BI_CHART_TYPES,
    BI_FORECAST_TYPES,
    BI_METRIC_SOURCES,
    BI_REPORT_FORMATS,
    BI_SCHEDULE_FREQUENCIES,
    BI_WIDGET_TYPES,
    BiDashboard,
    BiDashboardWidget,
    BiForecast,
    BiKpi,
    BiMetric,
    BiReport,
    BiReportTemplate,
    BiScheduledReport,
)
from app.models.integration import (  # noqa: E402, F401
    API_KEY_STATUSES,
    INTEGRATION_AUTH_TYPES,
    INTEGRATION_HEALTH,
    INTEGRATION_STATUSES,
    MARKETPLACE_CATEGORIES,
    SYNC_MODES,
    SYNC_STATUSES,
    WEBHOOK_LOG_STATUSES,
    WEBHOOK_STATUSES,
    ApiKey,
    Integration,
    IntegrationAccount,
    MarketplaceApp,
    OAuthToken,
    SyncHistory,
    Webhook,
    WebhookLog,
)
