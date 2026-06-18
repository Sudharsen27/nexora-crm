import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

DEAL_STAGES = (
    "new",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
)

DEAL_STAGE_LABELS = {
    "new": "New",
    "qualified": "Qualified",
    "proposal": "Proposal",
    "negotiation": "Negotiation",
    "won": "Won",
    "lost": "Lost",
}


class Deal(Base, TimestampMixin):
    __tablename__ = "deals"
    __table_args__ = (
        Index("ix_deals_tenant_id", "tenant_id"),
        Index("ix_deals_tenant_stage", "tenant_id", "stage"),
        Index("ix_deals_tenant_stage_position", "tenant_id", "stage", "position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    stage: Mapped[str] = mapped_column(String(30), nullable=False, default="new")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    lead_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="deals")
    lead: Mapped["Lead | None"] = relationship()
    assigned_to: Mapped["User | None"] = relationship(foreign_keys=[assigned_to_id])
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
