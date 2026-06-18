from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.task import TaskDashboardSummary


class DashboardRange(str, Enum):
    today = "today"
    last_7_days = "last_7_days"
    last_30_days = "last_30_days"
    this_quarter = "this_quarter"
    this_year = "this_year"
    custom = "custom"


class DashboardScope(str, Enum):
    my = "my"
    team = "team"


class DashboardQueryParams(BaseModel):
    range: DashboardRange = DashboardRange.last_30_days
    start_date: date | None = None
    end_date: date | None = None
    scope: DashboardScope = DashboardScope.my
    timezone: str = "UTC"

    @model_validator(mode="after")
    def validate_custom_range(self) -> Self:
        if self.range == DashboardRange.custom:
            if self.start_date is None or self.end_date is None:
                raise ValueError("start_date and end_date are required when range is custom")
            if self.end_date < self.start_date:
                raise ValueError("end_date must be greater than or equal to start_date")
            if (self.end_date - self.start_date).days > 366:
                raise ValueError("custom range cannot exceed 366 days")
        return self


class DashboardWidgetError(BaseModel):
    widget: str
    message: str


class DashboardMeta(BaseModel):
    range: DashboardRange
    scope: DashboardScope
    start_date: date
    end_date: date
    timezone: str
    visible_widgets: list[str]
    generated_at: datetime


class DashboardKpis(BaseModel):
    my_open_tasks: int | None = None
    my_overdue_tasks: int | None = None
    my_due_today_tasks: int | None = None
    open_pipeline_value: Decimal | None = None
    open_pipeline_count: int | None = None
    won_revenue: Decimal | None = None
    won_deals_count: int | None = None
    new_leads_count: int | None = None
    activities_count: int | None = None
    currency: str = "USD"


class DashboardFunnelStage(BaseModel):
    slug: str
    label: str
    count: int
    value: Decimal
    percent_of_total: float


class DashboardFunnel(BaseModel):
    stages: list[DashboardFunnelStage]
    lost_count: int
    lost_value: Decimal
    total_open_count: int
    total_open_value: Decimal


class DashboardRevenueBucket(BaseModel):
    period_start: date
    period_label: str
    value: Decimal
    deal_count: int


class DashboardRevenue(BaseModel):
    buckets: list[DashboardRevenueBucket]
    total_value: Decimal
    total_deals: int
    average_deal_size: Decimal | None
    win_rate: float | None


class DashboardLeadBucket(BaseModel):
    key: str
    label: str
    count: int
    percent: float


class DashboardLeadAnalytics(BaseModel):
    by_source: list[DashboardLeadBucket]
    by_status: list[DashboardLeadBucket]
    conversion_rate: float | None


class DashboardTeamMemberStats(BaseModel):
    user_id: UUID
    full_name: str
    open_deals: int
    pipeline_value: Decimal
    open_tasks: int
    overdue_tasks: int
    activities_count: int
    won_deals_count: int
    won_revenue: Decimal


class DashboardEntityRef(BaseModel):
    entity_type: str
    entity_id: UUID
    display_name: str
    href_path: str | None = None


class DashboardPersonRef(BaseModel):
    id: UUID
    full_name: str


class DashboardActivityItem(BaseModel):
    id: UUID
    activity_type: str
    description: str
    created_at: datetime
    scheduled_at: datetime | None
    created_by: DashboardPersonRef | None
    entity: DashboardEntityRef | None


class DashboardUpcomingTask(BaseModel):
    id: UUID
    title: str
    status: str
    priority: str
    due_date: date | None
    is_overdue: bool
    assigned_to: DashboardPersonRef | None
    entity: DashboardEntityRef | None


class DashboardCalendarItem(BaseModel):
    kind: Literal["task", "meeting", "call"]
    id: UUID
    title: str
    time: datetime | None


class DashboardCalendarDay(BaseModel):
    date: date
    task_count: int
    meeting_count: int
    call_count: int
    items: list[DashboardCalendarItem]


class DashboardResponse(BaseModel):
    meta: DashboardMeta
    kpis: DashboardKpis | None = None
    funnel: DashboardFunnel | None = None
    revenue: DashboardRevenue | None = None
    leads: DashboardLeadAnalytics | None = None
    team_performance: list[DashboardTeamMemberStats] | None = None
    recent_activities: list[DashboardActivityItem] | None = None
    upcoming_tasks: list[DashboardUpcomingTask] | None = None
    calendar: list[DashboardCalendarDay] | None = None
    tasks_summary: TaskDashboardSummary | None = None
    errors: list[DashboardWidgetError] = Field(default_factory=list)
