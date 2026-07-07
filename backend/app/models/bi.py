"""Business Intelligence & Executive Reporting models (Phase 13)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin

BI_DASHBOARD_VISIBILITY = ("private", "team", "public")
BI_WIDGET_TYPES = (
    "kpi",
    "line",
    "area",
    "bar",
    "horizontal_bar",
    "pie",
    "donut",
    "funnel",
    "gauge",
    "heatmap",
    "table",
    "ai_summary",
)
BI_CHART_TYPES = BI_WIDGET_TYPES
BI_REPORT_FORMATS = ("csv", "xlsx", "pdf", "png")
BI_SCHEDULE_FREQUENCIES = ("daily", "weekly", "monthly", "quarterly", "yearly")
BI_FORECAST_TYPES = ("revenue", "pipeline", "sales", "growth", "quarter", "annual")
BI_METRIC_SOURCES = ("deals", "leads", "contacts", "companies", "tasks", "meetings", "emails", "activities")


class BiDashboard(Base, TimestampMixin):
    __tablename__ = "bi_dashboards"
    __table_args__ = (
        Index("ix_bi_dashboards_tenant", "tenant_id"),
        Index("ix_bi_dashboards_tenant_owner", "tenant_id", "owner_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="private")
    is_executive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    layout: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    widgets: Mapped[list["BiDashboardWidget"]] = relationship(
        back_populates="dashboard", cascade="all, delete-orphan", order_by="BiDashboardWidget.sort_order"
    )


class BiDashboardWidget(Base, TimestampMixin):
    __tablename__ = "bi_dashboard_widgets"
    __table_args__ = (Index("ix_bi_dashboard_widgets_dashboard", "dashboard_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bi_dashboards.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    widget_type: Mapped[str] = mapped_column(String(40), nullable=False)
    metric_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    position_x: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    position_y: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    width: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    height: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    dashboard: Mapped["BiDashboard"] = relationship(back_populates="widgets")


class BiReportTemplate(Base, TimestampMixin):
    __tablename__ = "bi_report_templates"
    __table_args__ = (Index("ix_bi_report_templates_tenant", "tenant_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class BiReport(Base, TimestampMixin):
    __tablename__ = "bi_reports"
    __table_args__ = (Index("ix_bi_reports_tenant", "tenant_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bi_report_templates.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    chart_type: Mapped[str] = mapped_column(String(40), nullable=False, default="bar")
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    schedules: Mapped[list["BiScheduledReport"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class BiScheduledReport(Base, TimestampMixin):
    __tablename__ = "bi_scheduled_reports"
    __table_args__ = (Index("ix_bi_scheduled_reports_tenant", "tenant_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bi_reports.id", ondelete="CASCADE"), nullable=False
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    frequency: Mapped[str] = mapped_column(String(20), nullable=False, default="weekly")
    export_format: Mapped[str] = mapped_column(String(10), nullable=False, default="pdf")
    recipients: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    report: Mapped["BiReport"] = relationship(back_populates="schedules")


class BiForecast(Base, TimestampMixin):
    __tablename__ = "bi_forecasts"
    __table_args__ = (Index("ix_bi_forecasts_tenant_type", "tenant_id", "forecast_type"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    forecast_type: Mapped[str] = mapped_column(String(30), nullable=False)
    period_label: Mapped[str] = mapped_column(String(50), nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    predicted_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    confidence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)


class BiKpi(Base, TimestampMixin):
    __tablename__ = "bi_kpis"
    __table_args__ = (
        UniqueConstraint("tenant_id", "key", name="uq_bi_kpis_tenant_key"),
        Index("ix_bi_kpis_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False)
    target_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="number")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class BiMetric(Base, TimestampMixin):
    __tablename__ = "bi_metrics"
    __table_args__ = (
        UniqueConstraint("tenant_id", "key", name="uq_bi_metrics_tenant_key"),
        Index("ix_bi_metrics_tenant", "tenant_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    source_entity: Mapped[str] = mapped_column(String(50), nullable=False)
    aggregation: Mapped[str] = mapped_column(String(30), nullable=False, default="count")
    field: Mapped[str | None] = mapped_column(String(100), nullable=True)
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
