from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Self
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.dashboard import (
    DashboardActivityItem,
    DashboardEntityRef,
    DashboardFunnel,
    DashboardLeadAnalytics,
    DashboardPersonRef,
    DashboardRevenue,
    DashboardScope,
    DashboardTeamMemberStats,
    DashboardUpcomingTask,
)


class AnalyticsRange(str, Enum):
    today = "today"
    yesterday = "yesterday"
    this_week = "this_week"
    last_week = "last_week"
    last_7_days = "last_7_days"
    last_30_days = "last_30_days"
    this_month = "this_month"
    last_month = "last_month"
    this_quarter = "this_quarter"
    this_year = "this_year"
    custom = "custom"


class AnalyticsQueryParams(BaseModel):
    range: AnalyticsRange = AnalyticsRange.last_30_days
    start_date: date | None = None
    end_date: date | None = None
    scope: DashboardScope = DashboardScope.my
    timezone: str = "UTC"
    owner_id: UUID | None = None
    company_id: UUID | None = None
    stage: str | None = None

    @model_validator(mode="after")
    def validate_custom_range(self) -> Self:
        if self.range == AnalyticsRange.custom:
            if self.start_date is None or self.end_date is None:
                raise ValueError("start_date and end_date are required when range is custom")
            if self.end_date < self.start_date:
                raise ValueError("end_date must be greater than or equal to start_date")
            if (self.end_date - self.start_date).days > 366:
                raise ValueError("custom range cannot exceed 366 days")
        return self


class AnalyticsMeta(BaseModel):
    range: AnalyticsRange
    scope: DashboardScope
    start_date: date
    end_date: date
    timezone: str
    generated_at: datetime
    cached: bool = False


class AnalyticsTrendPoint(BaseModel):
    label: str
    value: Decimal | int


class AnalyticsKpiCard(BaseModel):
    key: str
    label: str
    value: Decimal | int
    formatted_value: str
    growth_percent: float | None = None
    comparison_label: str = "vs last period"
    trend: list[AnalyticsTrendPoint] = Field(default_factory=list)
    currency: str | None = None
    href_path: str | None = None


class AnalyticsOverviewResponse(BaseModel):
    meta: AnalyticsMeta
    kpis: list[AnalyticsKpiCard]
    recent_activities: list[DashboardActivityItem] = Field(default_factory=list)
    upcoming_tasks: list[DashboardUpcomingTask] = Field(default_factory=list)
    recent_deals: list[DashboardEntityRef] = Field(default_factory=list)
    recent_companies: list[DashboardEntityRef] = Field(default_factory=list)
    latest_contacts: list[DashboardEntityRef] = Field(default_factory=list)
    upcoming_meetings: list[DashboardActivityItem] = Field(default_factory=list)


class AnalyticsRevenueResponse(BaseModel):
    meta: AnalyticsMeta
    revenue: DashboardRevenue
    monthly_revenue: Decimal
    annual_revenue: Decimal
    average_deal_value: Decimal | None = None
    win_rate: float | None = None
    loss_rate: float | None = None


class AnalyticsPipelineResponse(BaseModel):
    meta: AnalyticsMeta
    funnel: DashboardFunnel
    pipeline_value: Decimal
    deals_by_stage: list[dict]


class AnalyticsLeadsResponse(BaseModel):
    meta: AnalyticsMeta
    leads: DashboardLeadAnalytics
    new_leads: int
    qualified_leads: int
    lead_conversion_rate: float | None = None


class AnalyticsDealsResponse(BaseModel):
    meta: AnalyticsMeta
    deals_won: int
    deals_lost: int
    won_revenue: Decimal
    lost_revenue: Decimal
    average_deal_size: Decimal | None = None
    average_sales_cycle_days: float | None = None
    win_rate: float | None = None


class AnalyticsTasksResponse(BaseModel):
    meta: AnalyticsMeta
    due_today: int
    open_tasks: int
    overdue_tasks: int
    completed_tasks: int
    completion_rate: float | None = None
    by_status: list[dict]


class AnalyticsActivityHeatmapDay(BaseModel):
    date: date
    count: int


class AnalyticsActivitiesResponse(BaseModel):
    meta: AnalyticsMeta
    total_activities: int
    open_activities: int
    meetings_today: int
    heatmap: list[AnalyticsActivityHeatmapDay]


class AnalyticsTeamResponse(BaseModel):
    meta: AnalyticsMeta
    members: list[DashboardTeamMemberStats]


class AnalyticsForecastBucket(BaseModel):
    period_start: date
    period_label: str
    forecast_value: Decimal
    won_value: Decimal


class AnalyticsForecastResponse(BaseModel):
    meta: AnalyticsMeta
    forecast_revenue: Decimal
    buckets: list[AnalyticsForecastBucket]
