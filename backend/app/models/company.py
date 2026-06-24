import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

COMPANY_SORT_FIELDS = (
    "company_name",
    "company_code",
    "industry",
    "city",
    "country",
    "annual_revenue",
    "employee_count",
    "created_at",
)

COMPANY_INDUSTRIES = (
    "technology",
    "finance",
    "healthcare",
    "manufacturing",
    "retail",
    "education",
    "real_estate",
    "consulting",
    "media",
    "other",
)


class Company(Base, TimestampMixin):
    __tablename__ = "companies"
    __table_args__ = (
        Index("ix_companies_tenant_id", "tenant_id"),
        Index("ix_companies_tenant_created_at", "tenant_id", "created_at"),
        Index("ix_companies_tenant_industry", "tenant_id", "industry"),
        UniqueConstraint("tenant_id", "company_code", name="uq_companies_tenant_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    annual_revenue: Mapped[Decimal | None] = mapped_column(Numeric(16, 2), nullable=True)
    employee_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="companies")
    owner: Mapped["User | None"] = relationship(foreign_keys=[owner_id])
    created_by: Mapped["User | None"] = relationship(foreign_keys=[created_by_id])
    contacts: Mapped[list["Contact"]] = relationship(back_populates="linked_company")
    deals: Mapped[list["Deal"]] = relationship(back_populates="company")
