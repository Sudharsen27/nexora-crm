"""Pydantic schemas for Business Intelligence API."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.analytics import AnalyticsQueryParams


class BiWidgetBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    widget_type: str = Field(min_length=1, max_length=40)
    metric_key: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 2
    sort_order: int = 0


class BiWidgetCreate(BiWidgetBase):
    pass


class BiWidgetResponse(BiWidgetBase):
    id: uuid.UUID
    dashboard_id: uuid.UUID
    data: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class BiDashboardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    visibility: str = "private"
    is_executive: bool = False
    layout: dict[str, Any] = Field(default_factory=dict)
    filters: dict[str, Any] = Field(default_factory=dict)
    widgets: list[BiWidgetCreate] = Field(default_factory=list)


class BiDashboardUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    visibility: str | None = None
    is_executive: bool | None = None
    layout: dict[str, Any] | None = None
    filters: dict[str, Any] | None = None
    widgets: list[BiWidgetCreate] | None = None


class BiDashboardSummary(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    visibility: str
    is_executive: bool
    widget_count: int = 0
    updated_at: datetime

    model_config = {"from_attributes": True}


class BiDashboardDetail(BiDashboardSummary):
    layout: dict[str, Any]
    filters: dict[str, Any]
    widgets: list[BiWidgetResponse]


class BiReportConfig(BaseModel):
    metric_key: str = "deals_by_stage"
    dimensions: list[str] = Field(default_factory=list)
    filters: dict[str, Any] = Field(default_factory=dict)
    group_by: str | None = None
    sort_by: str | None = None
    date_range: str = "last_30_days"
    drill_down_entity: str | None = None


class BiReportCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    chart_type: str = "bar"
    config: BiReportConfig | dict[str, Any] = Field(default_factory=dict)
    template_id: uuid.UUID | None = None


class BiReportUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    chart_type: str | None = None
    config: BiReportConfig | dict[str, Any] | None = None
    is_favorite: bool | None = None


class BiReportSummary(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    chart_type: str
    is_favorite: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class BiReportDetail(BiReportSummary):
    config: dict[str, Any]
    template_id: uuid.UUID | None


class BiReportRunResult(BaseModel):
    report_id: uuid.UUID
    chart_type: str
    columns: list[str]
    rows: list[dict[str, Any]]
    series: list[dict[str, Any]]
    totals: dict[str, Any] = Field(default_factory=dict)
    drill_down: list[dict[str, Any]] = Field(default_factory=list)


class BiTemplateSummary(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    description: str | None
    is_system: bool
    config: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class BiScheduleCreate(BaseModel):
    report_id: uuid.UUID
    frequency: str = "weekly"
    export_format: str = "pdf"
    recipients: list[str] = Field(default_factory=list)
    is_active: bool = True


class BiScheduleResponse(BaseModel):
    id: uuid.UUID
    report_id: uuid.UUID
    frequency: str
    export_format: str
    recipients: list[str]
    is_active: bool
    next_run_at: datetime | None
    last_run_at: datetime | None

    model_config = {"from_attributes": True}


class BiKpiCreate(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=255)
    metric_key: str = Field(min_length=1, max_length=100)
    target_value: Decimal | None = None
    unit: str = "number"
    description: str | None = None


class BiKpiResponse(BaseModel):
    id: uuid.UUID
    key: str
    label: str
    metric_key: str
    target_value: Decimal | None
    current_value: Decimal | float | int | str | None = None
    unit: str
    progress_pct: float | None = None
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class BiMetricResponse(BaseModel):
    id: uuid.UUID
    key: str
    label: str
    source_entity: str
    aggregation: str
    field: str | None
    filters: dict[str, Any]
    is_system: bool

    model_config = {"from_attributes": True}


class BiForecastResponse(BaseModel):
    id: uuid.UUID | None = None
    forecast_type: str
    period_label: str
    predicted_value: Decimal | None
    confidence: int | None
    data: dict[str, Any]
    ai_summary: str | None = None
    buckets: list[dict[str, Any]] = Field(default_factory=list)


class BiExecutiveSummary(BaseModel):
    kpis: list[dict[str, Any]]
    widgets: list[BiWidgetResponse]
    revenue_trend: list[dict[str, Any]]
    pipeline: list[dict[str, Any]]
    top_deals: list[dict[str, Any]]
    team_performance: list[dict[str, Any]]
    ai_summary: str
    recent_reports: list[BiReportSummary]
    scheduled_reports: list[BiScheduleResponse]
    generated_at: datetime


class BiExportRequest(BaseModel):
    report_id: uuid.UUID
    format: str = "csv"
