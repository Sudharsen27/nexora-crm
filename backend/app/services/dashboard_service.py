"""Orchestrates tenant dashboard aggregation with RBAC-aware widget assembly."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext
from app.db.mixins import utcnow
from app.models.deal import DEAL_STAGE_LABELS
from app.repositories.dashboard_repository import (
    DashboardRepository,
    DashboardScopeFilter,
    EntityRef,
)
from app.schemas.dashboard import (
    DashboardActivityItem,
    DashboardCalendarDay,
    DashboardCalendarItem,
    DashboardEntityRef,
    DashboardFunnel,
    DashboardFunnelStage,
    DashboardKpis,
    DashboardLeadAnalytics,
    DashboardLeadBucket,
    DashboardMeta,
    DashboardPersonRef,
    DashboardQueryParams,
    DashboardRange,
    DashboardResponse,
    DashboardRevenue,
    DashboardRevenueBucket,
    DashboardScope,
    DashboardTeamMemberStats,
    DashboardUpcomingTask,
    DashboardWidgetError,
)

logger = logging.getLogger(__name__)

WIDGET_KPIS = "kpis"
WIDGET_FUNNEL = "funnel"
WIDGET_REVENUE = "revenue"
WIDGET_LEADS = "leads"
WIDGET_TEAM = "team_performance"
WIDGET_ACTIVITIES = "recent_activities"
WIDGET_UPCOMING = "upcoming_tasks"
WIDGET_CALENDAR = "calendar"
WIDGET_TASKS_SUMMARY = "tasks_summary"


@dataclass(frozen=True)
class DashboardDateRange:
    start: datetime
    end: datetime
    start_date: date
    end_date: date
    preset: DashboardRange
    timezone: str


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DashboardRepository(db)

    def get_dashboard(self, ctx: TenantContext, params: DashboardQueryParams) -> DashboardResponse:
        date_range = self._resolve_date_range(params)
        permissions = set(ctx.permissions)
        visible = self._visible_widgets(permissions, params.scope)
        scope = DashboardScopeFilter(scope=params.scope.value, user_id=ctx.membership.user_id)
        errors: list[DashboardWidgetError] = []

        response = DashboardResponse(
            meta=DashboardMeta(
                range=params.range,
                scope=params.scope,
                start_date=date_range.start_date,
                end_date=date_range.end_date,
                timezone=date_range.timezone,
                visible_widgets=visible,
                generated_at=utcnow(),
            ),
            errors=errors,
        )

        if WIDGET_TASKS_SUMMARY in visible:
            self._safe_widget(
                errors,
                WIDGET_TASKS_SUMMARY,
                lambda: setattr(
                    response,
                    "tasks_summary",
                    self.repo.get_task_summary(ctx.tenant.id, ctx.membership.user_id),
                ),
            )

        if WIDGET_KPIS in visible:
            self._safe_widget(
                errors,
                WIDGET_KPIS,
                lambda: setattr(
                    response,
                    "kpis",
                    self._build_kpis(ctx, scope, date_range, permissions),
                ),
            )

        if WIDGET_FUNNEL in visible:
            self._safe_widget(
                errors,
                WIDGET_FUNNEL,
                lambda: setattr(response, "funnel", self._build_funnel(ctx.tenant.id, scope)),
            )

        if WIDGET_REVENUE in visible:
            self._safe_widget(
                errors,
                WIDGET_REVENUE,
                lambda: setattr(
                    response,
                    "revenue",
                    self._build_revenue(ctx.tenant.id, scope, date_range, params),
                ),
            )

        if WIDGET_LEADS in visible:
            self._safe_widget(
                errors,
                WIDGET_LEADS,
                lambda: setattr(
                    response,
                    "leads",
                    self._build_lead_analytics(ctx.tenant.id, scope, date_range),
                ),
            )

        if WIDGET_TEAM in visible:
            self._safe_widget(
                errors,
                WIDGET_TEAM,
                lambda: setattr(
                    response,
                    "team_performance",
                    self._build_team_performance(ctx.tenant.id, date_range),
                ),
            )

        if WIDGET_ACTIVITIES in visible:
            self._safe_widget(
                errors,
                WIDGET_ACTIVITIES,
                lambda: setattr(
                    response,
                    "recent_activities",
                    self._build_recent_activities(ctx, permissions),
                ),
            )

        if WIDGET_UPCOMING in visible:
            self._safe_widget(
                errors,
                WIDGET_UPCOMING,
                lambda: setattr(
                    response,
                    "upcoming_tasks",
                    self._build_upcoming_tasks(ctx.tenant.id, scope, permissions),
                ),
            )

        if WIDGET_CALENDAR in visible:
            self._safe_widget(
                errors,
                WIDGET_CALENDAR,
                lambda: setattr(
                    response,
                    "calendar",
                    self._build_calendar(ctx.tenant.id, scope, params.timezone, permissions),
                ),
            )

        return response

    def _visible_widgets(self, permissions: set[str], scope: DashboardScope) -> list[str]:
        widgets: list[str] = []
        if permissions & {"task:read", "deal:read", "lead:read", "activity:read"}:
            widgets.append(WIDGET_KPIS)
        if "task:read" in permissions:
            widgets.extend([WIDGET_TASKS_SUMMARY, WIDGET_UPCOMING, WIDGET_CALENDAR])
        if "deal:read" in permissions:
            widgets.extend([WIDGET_FUNNEL, WIDGET_REVENUE])
        if "lead:read" in permissions:
            widgets.append(WIDGET_LEADS)
        if "activity:read" in permissions:
            widgets.append(WIDGET_ACTIVITIES)
        if scope == DashboardScope.team and "task:read" in permissions and "user:read" in permissions:
            widgets.append(WIDGET_TEAM)
        return list(dict.fromkeys(widgets))

    def _safe_widget(self, errors: list[DashboardWidgetError], widget: str, builder) -> None:
        try:
            builder()
        except Exception as exc:
            logger.exception("Dashboard widget %s failed", widget)
            errors.append(DashboardWidgetError(widget=widget, message=str(exc)))

    def _resolve_date_range(self, params: DashboardQueryParams) -> DashboardDateRange:
        try:
            tz = ZoneInfo(params.timezone)
        except (ZoneInfoNotFoundError, KeyError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid timezone",
            ) from exc

        now_local = datetime.now(tz)
        today_local = now_local.date()

        if params.range == DashboardRange.today:
            start_date = today_local
            end_date = today_local
        elif params.range == DashboardRange.last_7_days:
            end_date = today_local
            start_date = today_local - timedelta(days=6)
        elif params.range == DashboardRange.last_30_days:
            end_date = today_local
            start_date = today_local - timedelta(days=29)
        elif params.range == DashboardRange.this_quarter:
            quarter = (today_local.month - 1) // 3
            start_date = date(today_local.year, quarter * 3 + 1, 1)
            end_date = today_local
        elif params.range == DashboardRange.this_year:
            start_date = date(today_local.year, 1, 1)
            end_date = today_local
        else:
            if params.start_date is None or params.end_date is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="start_date and end_date are required for custom range",
                )
            start_date = params.start_date
            end_date = params.end_date

        start = datetime.combine(start_date, time.min, tzinfo=tz).astimezone(UTC)
        end = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=tz).astimezone(UTC)
        return DashboardDateRange(
            start=start,
            end=end,
            start_date=start_date,
            end_date=end_date,
            preset=params.range,
            timezone=params.timezone,
        )

    def _revenue_granularity(
        self, params: DashboardQueryParams, date_range: DashboardDateRange
    ) -> str:
        if params.range in (DashboardRange.today, DashboardRange.last_7_days):
            return "day"
        if params.range == DashboardRange.last_30_days:
            return "day"
        if params.range == DashboardRange.this_quarter:
            return "week"
        if params.range == DashboardRange.this_year:
            return "month"
        span = (date_range.end_date - date_range.start_date).days
        if span <= 31:
            return "day"
        if span <= 90:
            return "week"
        return "month"

    def _build_kpis(
        self,
        ctx: TenantContext,
        scope: DashboardScopeFilter,
        date_range: DashboardDateRange,
        permissions: set[str],
    ) -> DashboardKpis:
        kpis = DashboardKpis()
        if "task:read" in permissions:
            summary = self.repo.get_task_summary(ctx.tenant.id, ctx.membership.user_id)
            kpis.my_open_tasks = summary.my_open
            kpis.my_overdue_tasks = summary.my_overdue
            kpis.my_due_today_tasks = summary.my_due_today
        if "deal:read" in permissions:
            pipeline_value, pipeline_count = self.repo.get_pipeline_aggregate(ctx.tenant.id, scope)
            won_value, won_count = self.repo.get_won_revenue(
                ctx.tenant.id, scope, date_range.start, date_range.end
            )
            kpis.open_pipeline_value = pipeline_value
            kpis.open_pipeline_count = pipeline_count
            kpis.won_revenue = won_value
            kpis.won_deals_count = won_count
        if "lead:read" in permissions:
            kpis.new_leads_count = self.repo.count_leads_created(
                ctx.tenant.id, scope, date_range.start, date_range.end
            )
        if "activity:read" in permissions:
            kpis.activities_count = self.repo.count_activities(
                ctx.tenant.id, scope, date_range.start, date_range.end
            )
        return kpis

    def _build_funnel(self, tenant_id, scope: DashboardScopeFilter) -> DashboardFunnel:
        stages, lost_count, lost_value, total_open_count, total_open_value = (
            self.repo.get_funnel_stages(tenant_id, scope)
        )
        total_count = sum(stage.count for stage in stages) or 1
        return DashboardFunnel(
            stages=[
                DashboardFunnelStage(
                    slug=stage.stage,
                    label=DEAL_STAGE_LABELS.get(stage.stage, stage.stage.title()),
                    count=stage.count,
                    value=stage.value,
                    percent_of_total=round(stage.count / total_count * 100, 1),
                )
                for stage in stages
            ],
            lost_count=lost_count,
            lost_value=lost_value,
            total_open_count=total_open_count,
            total_open_value=total_open_value,
        )

    def _build_revenue(
        self,
        tenant_id,
        scope: DashboardScopeFilter,
        date_range: DashboardDateRange,
        params: DashboardQueryParams,
    ) -> DashboardRevenue:
        granularity = self._revenue_granularity(params, date_range)
        buckets = self.repo.get_revenue_buckets(
            tenant_id,
            scope,
            date_range.start,
            date_range.end,
            granularity,  # type: ignore[arg-type]
        )
        total_value, total_deals = self.repo.get_won_revenue(
            tenant_id, scope, date_range.start, date_range.end
        )
        won_count, lost_count = self.repo.get_win_loss_counts(
            tenant_id, scope, date_range.start, date_range.end
        )
        win_rate = None
        if won_count + lost_count > 0:
            win_rate = round(won_count / (won_count + lost_count) * 100, 1)
        average = None
        if total_deals > 0:
            average = (total_value / total_deals).quantize(Decimal("0.01"))
        return DashboardRevenue(
            buckets=[
                DashboardRevenueBucket(
                    period_start=bucket.bucket_start.date(),
                    period_label=self._format_bucket_label(bucket.bucket_start, granularity),
                    value=bucket.value,
                    deal_count=bucket.deal_count,
                )
                for bucket in buckets
            ],
            total_value=total_value,
            total_deals=total_deals,
            average_deal_size=average,
            win_rate=win_rate,
        )

    def _build_lead_analytics(
        self, tenant_id, scope: DashboardScopeFilter, date_range: DashboardDateRange
    ) -> DashboardLeadAnalytics:
        by_source_rows = self.repo.get_leads_by_source(
            tenant_id, scope, date_range.start, date_range.end
        )
        source_total = sum(row.count for row in by_source_rows) or 1
        by_status_rows = self.repo.get_leads_by_status(tenant_id, scope)
        status_total = sum(row.count for row in by_status_rows) or 1
        created = self.repo.count_leads_created(
            tenant_id, scope, date_range.start, date_range.end
        )
        converted = self.repo.count_lead_conversions(
            tenant_id, scope, date_range.start, date_range.end
        )
        conversion_rate = round(converted / created * 100, 1) if created > 0 else None
        return DashboardLeadAnalytics(
            by_source=[
                DashboardLeadBucket(
                    key=row.key,
                    label=self.repo.lead_source_label(row.key),
                    count=row.count,
                    percent=round(row.count / source_total * 100, 1),
                )
                for row in by_source_rows
            ],
            by_status=[
                DashboardLeadBucket(
                    key=row.key,
                    label=self.repo.lead_status_label(row.key),
                    count=row.count,
                    percent=round(row.count / status_total * 100, 1),
                )
                for row in by_status_rows
            ],
            conversion_rate=conversion_rate,
        )

    def _build_team_performance(
        self, tenant_id, date_range: DashboardDateRange
    ) -> list[DashboardTeamMemberStats]:
        rows = self.repo.get_team_performance(tenant_id, date_range.start, date_range.end)
        return [
            DashboardTeamMemberStats(
                user_id=row.user_id,
                full_name=row.full_name,
                open_deals=row.open_deals,
                pipeline_value=row.pipeline_value,
                open_tasks=row.open_tasks,
                overdue_tasks=row.overdue_tasks,
                activities_count=row.activities_count,
                won_deals_count=row.won_deals_count,
                won_revenue=row.won_revenue,
            )
            for row in rows
        ]

    def _build_recent_activities(
        self, ctx: TenantContext, permissions: set[str]
    ) -> list[DashboardActivityItem]:
        activities = self.repo.get_recent_activities(ctx.tenant.id)
        refs = [
            EntityRef(entity_type=activity.entity_type, entity_id=activity.entity_id)
            for activity in activities
        ]
        names = self.repo.resolve_entity_names(ctx.tenant.id, refs)
        items: list[DashboardActivityItem] = []
        for activity in activities:
            entity = None
            if self._can_read_entity(permissions, activity.entity_type):
                display_name = names.get((activity.entity_type, activity.entity_id))
                if display_name:
                    entity = DashboardEntityRef(
                        entity_type=activity.entity_type,
                        entity_id=activity.entity_id,
                        display_name=display_name,
                        href_path=f"{activity.entity_type}s/{activity.entity_id}",
                    )
            creator = None
            if activity.created_by:
                creator = DashboardPersonRef(
                    id=activity.created_by.id,
                    full_name=activity.created_by.full_name,
                )
            items.append(
                DashboardActivityItem(
                    id=activity.id,
                    activity_type=activity.activity_type,
                    description=activity.description,
                    created_at=activity.created_at,
                    scheduled_at=activity.scheduled_at,
                    created_by=creator,
                    entity=entity,
                )
            )
        return items

    def _build_upcoming_tasks(
        self, tenant_id, scope: DashboardScopeFilter, permissions: set[str]
    ) -> list[DashboardUpcomingTask]:
        today = date.today()
        tasks = self.repo.get_upcoming_tasks(tenant_id, scope)
        refs = [
            EntityRef(entity_type=task.entity_type, entity_id=task.entity_id)
            for task in tasks
            if task.entity_type and task.entity_id
        ]
        names = self.repo.resolve_entity_names(tenant_id, refs)
        items: list[DashboardUpcomingTask] = []
        for task in tasks:
            entity = None
            if task.entity_type and task.entity_id and self._can_read_entity(permissions, task.entity_type):
                display_name = names.get((task.entity_type, task.entity_id))
                if display_name:
                    entity = DashboardEntityRef(
                        entity_type=task.entity_type,
                        entity_id=task.entity_id,
                        display_name=display_name,
                        href_path=f"{task.entity_type}s/{task.entity_id}",
                    )
            assigned = None
            if task.assigned_to:
                assigned = DashboardPersonRef(
                    id=task.assigned_to.id,
                    full_name=task.assigned_to.full_name,
                )
            items.append(
                DashboardUpcomingTask(
                    id=task.id,
                    title=task.title,
                    status=task.status,
                    priority=task.priority,
                    due_date=task.due_date,
                    is_overdue=bool(task.due_date and task.due_date < today),
                    assigned_to=assigned,
                    entity=entity,
                )
            )
        return items

    def _build_calendar(
        self,
        tenant_id,
        scope: DashboardScopeFilter,
        timezone: str,
        permissions: set[str],
    ) -> list[DashboardCalendarDay]:
        tz = ZoneInfo(timezone)
        today = datetime.now(tz).date()
        end_date = today + timedelta(days=6)
        start_dt = datetime.combine(today, time.min, tzinfo=tz).astimezone(UTC)
        end_dt = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=tz).astimezone(UTC)

        days = [today + timedelta(days=offset) for offset in range(7)]
        day_map: dict[date, DashboardCalendarDay] = {
            day: DashboardCalendarDay(
                date=day,
                task_count=0,
                meeting_count=0,
                call_count=0,
                items=[],
            )
            for day in days
        }

        if "task:read" in permissions:
            tasks = self.repo.get_calendar_tasks(tenant_id, scope, today, end_date)
            for task in tasks:
                if task.due_date is None or task.due_date not in day_map:
                    continue
                day = day_map[task.due_date]
                day.task_count += 1
                if len(day.items) < 5:
                    day.items.append(
                        DashboardCalendarItem(
                            kind="task",
                            id=task.id,
                            title=task.title,
                            time=datetime.combine(task.due_date, time.min, tzinfo=tz),
                        )
                    )

        if "activity:read" in permissions:
            activities = self.repo.get_calendar_activities(tenant_id, scope, start_dt, end_dt)
            for activity in activities:
                if activity.scheduled_at is None:
                    continue
                local_dt = activity.scheduled_at.astimezone(tz)
                local_day = local_dt.date()
                if local_day not in day_map:
                    continue
                day = day_map[local_day]
                if activity.activity_type == "meeting":
                    day.meeting_count += 1
                    kind = "meeting"
                else:
                    day.call_count += 1
                    kind = "call"
                if len(day.items) < 5:
                    day.items.append(
                        DashboardCalendarItem(
                            kind=kind,
                            id=activity.id,
                            title=activity.description[:80],
                            time=activity.scheduled_at,
                        )
                    )

        return [day_map[day] for day in days]

    @staticmethod
    def _can_read_entity(permissions: set[str], entity_type: str) -> bool:
        return f"{entity_type}:read" in permissions

    @staticmethod
    def _format_bucket_label(bucket_start: datetime, granularity: str) -> str:
        if granularity == "month":
            return bucket_start.strftime("%b %Y")
        if granularity == "week":
            return bucket_start.strftime("%b %d")
        return bucket_start.strftime("%b %d")
