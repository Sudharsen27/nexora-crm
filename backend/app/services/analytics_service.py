"""Enterprise analytics orchestration with caching and RBAC."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.cache import cached_get
from app.core.deps import TenantContext
from app.core.timezone import resolve_timezone
from app.db.mixins import utcnow
from app.models.deal import DEAL_STAGE_LABELS
from app.repositories.analytics_repository import AnalyticsFilters, AnalyticsRepository
from app.repositories.dashboard_repository import DashboardScopeFilter
from app.schemas.analytics import (
    AnalyticsActivitiesResponse,
    AnalyticsActivityHeatmapDay,
    AnalyticsDealsResponse,
    AnalyticsForecastBucket,
    AnalyticsForecastResponse,
    AnalyticsKpiCard,
    AnalyticsLeadsResponse,
    AnalyticsMeta,
    AnalyticsOverviewResponse,
    AnalyticsPipelineResponse,
    AnalyticsQueryParams,
    AnalyticsRange,
    AnalyticsRevenueResponse,
    AnalyticsTasksResponse,
    AnalyticsTeamResponse,
    AnalyticsTrendPoint,
)
from app.schemas.dashboard import (
    DashboardActivityItem,
    DashboardEntityRef,
    DashboardFunnel,
    DashboardFunnelStage,
    DashboardLeadAnalytics,
    DashboardLeadBucket,
    DashboardPersonRef,
    DashboardRevenue,
    DashboardRevenueBucket,
    DashboardScope,
    DashboardTeamMemberStats,
    DashboardUpcomingTask,
)
from app.services.dashboard_service import DashboardService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AnalyticsDateRange:
    start: datetime
    end: datetime
    start_date: date
    end_date: date
    preset: AnalyticsRange
    timezone: str


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AnalyticsRepository(db)
        self.dashboard = DashboardService(db)

    def _cache_payload(self, ctx: TenantContext, params: AnalyticsQueryParams) -> dict:
        return {
            "tenant": str(ctx.tenant.id),
            "user": str(ctx.membership.user_id),
            "params": params.model_dump(mode="json"),
        }

    def _resolve_date_range(self, params: AnalyticsQueryParams) -> AnalyticsDateRange:
        try:
            tz = resolve_timezone(params.timezone)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid timezone") from exc

        now_local = datetime.now(tz)
        today = now_local.date()

        if params.range == AnalyticsRange.today:
            start_date, end_date = today, today
        elif params.range == AnalyticsRange.yesterday:
            start_date = end_date = today - timedelta(days=1)
        elif params.range == AnalyticsRange.this_week:
            start_date = today - timedelta(days=today.weekday())
            end_date = today
        elif params.range == AnalyticsRange.last_week:
            end_date = today - timedelta(days=today.weekday() + 1)
            start_date = end_date - timedelta(days=6)
        elif params.range == AnalyticsRange.last_7_days:
            end_date = today
            start_date = today - timedelta(days=6)
        elif params.range == AnalyticsRange.last_30_days:
            end_date = today
            start_date = today - timedelta(days=29)
        elif params.range == AnalyticsRange.this_month:
            start_date = date(today.year, today.month, 1)
            end_date = today
        elif params.range == AnalyticsRange.last_month:
            first_this = date(today.year, today.month, 1)
            end_date = first_this - timedelta(days=1)
            start_date = date(end_date.year, end_date.month, 1)
        elif params.range == AnalyticsRange.this_quarter:
            quarter = (today.month - 1) // 3
            start_date = date(today.year, quarter * 3 + 1, 1)
            end_date = today
        elif params.range == AnalyticsRange.this_year:
            start_date = date(today.year, 1, 1)
            end_date = today
        else:
            if params.start_date is None or params.end_date is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="start_date and end_date are required for custom range",
                )
            start_date, end_date = params.start_date, params.end_date

        start = datetime.combine(start_date, time.min, tzinfo=tz).astimezone(UTC)
        end = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=tz).astimezone(UTC)
        return AnalyticsDateRange(
            start=start,
            end=end,
            start_date=start_date,
            end_date=end_date,
            preset=params.range,
            timezone=params.timezone,
        )

    def _previous_range(self, date_range: AnalyticsDateRange) -> tuple[datetime, datetime]:
        span = (date_range.end_date - date_range.start_date).days + 1
        prev_end_date = date_range.start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=span - 1)
        tz = resolve_timezone(date_range.timezone)
        prev_start = datetime.combine(prev_start_date, time.min, tzinfo=tz).astimezone(UTC)
        prev_end = datetime.combine(prev_end_date + timedelta(days=1), time.min, tzinfo=tz).astimezone(UTC)
        return prev_start, prev_end

    def _scope(self, params: AnalyticsQueryParams, user_id) -> DashboardScopeFilter:
        return DashboardScopeFilter(scope=params.scope.value, user_id=user_id)

    def _filters(self, params: AnalyticsQueryParams, user_id) -> AnalyticsFilters:
        return AnalyticsFilters(
            scope=self._scope(params, user_id),
            owner_id=params.owner_id,
            company_id=params.company_id,
            stage=params.stage,
        )

    def _meta(self, params: AnalyticsQueryParams, date_range: AnalyticsDateRange, cached: bool = False) -> AnalyticsMeta:
        return AnalyticsMeta(
            range=params.range,
            scope=params.scope,
            start_date=date_range.start_date,
            end_date=date_range.end_date,
            timezone=date_range.timezone,
            generated_at=utcnow(),
            cached=cached,
        )

    def _growth(self, current: Decimal | int, previous: Decimal | int) -> float | None:
        if previous == 0:
            return 100.0 if current > 0 else None
        return round((float(current) - float(previous)) / float(previous) * 100, 1)

    def _money(self, value: Decimal, currency: str = "USD") -> str:
        return f"${value:,.0f}" if currency == "USD" else f"{value:,.2f} {currency}"

    def get_overview(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsOverviewResponse:
        payload = self._cache_payload(ctx, params)

        def factory() -> AnalyticsOverviewResponse:
            return self._build_overview(ctx, params)

        result = cached_get("analytics:overview", payload, factory)
        result.meta.cached = True
        return result

    def _build_overview(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsOverviewResponse:
        date_range = self._resolve_date_range(params)
        prev_start, prev_end = self._previous_range(date_range)
        scope = self._scope(params, ctx.membership.user_id)
        filters = self._filters(params, ctx.membership.user_id)
        permissions = set(ctx.permissions)
        currency = "USD"
        slug = ctx.tenant.slug
        kpis: list[AnalyticsKpiCard] = []

        if "deal:read" in permissions:
            pipeline_value, pipeline_count = self.repo.get_pipeline_aggregate(ctx.tenant.id, scope)
            won_value, won_count = self.repo.get_won_revenue(
                ctx.tenant.id, scope, date_range.start, date_range.end
            )
            lost_value, lost_count = self.repo.get_lost_revenue(
                ctx.tenant.id, filters, date_range.start, date_range.end
            )
            prev_won, prev_won_count = self.repo.get_won_revenue(
                ctx.tenant.id, scope, prev_start, prev_end
            )
            forecast = self.repo.get_forecast_revenue(ctx.tenant.id, filters)
            trend_vals = self.repo.get_revenue_trend_points(ctx.tenant.id, scope, date_range.end)
            avg_deal = (won_value / won_count).quantize(Decimal("0.01")) if won_count else None

            kpis.extend(
                [
                    AnalyticsKpiCard(
                        key="total_revenue",
                        label="Total Revenue",
                        value=won_value,
                        formatted_value=self._money(won_value, currency),
                        growth_percent=self._growth(won_value, prev_won),
                        trend=[AnalyticsTrendPoint(label=str(i), value=v) for i, v in enumerate(trend_vals)],
                        currency=currency,
                        href_path=f"/{slug}/deals",
                    ),
                    AnalyticsKpiCard(
                        key="pipeline_value",
                        label="Pipeline Value",
                        value=pipeline_value,
                        formatted_value=self._money(pipeline_value, currency),
                        currency=currency,
                        href_path=f"/{slug}/pipeline",
                    ),
                    AnalyticsKpiCard(
                        key="deals_won",
                        label="Deals Won",
                        value=won_count,
                        formatted_value=str(won_count),
                        growth_percent=self._growth(won_count, prev_won_count),
                        href_path=f"/{slug}/deals",
                    ),
                    AnalyticsKpiCard(
                        key="deals_lost",
                        label="Deals Lost",
                        value=lost_count,
                        formatted_value=str(lost_count),
                        href_path=f"/{slug}/deals",
                    ),
                    AnalyticsKpiCard(
                        key="forecast_revenue",
                        label="Forecast Revenue",
                        value=forecast,
                        formatted_value=self._money(forecast, currency),
                        currency=currency,
                        href_path=f"/{slug}/pipeline",
                    ),
                    AnalyticsKpiCard(
                        key="average_deal_size",
                        label="Average Deal Size",
                        value=avg_deal or Decimal("0"),
                        formatted_value=self._money(avg_deal or Decimal("0"), currency),
                        currency=currency,
                    ),
                ]
            )

        if "lead:read" in permissions:
            new_leads = self.repo.count_leads_created(
                ctx.tenant.id, scope, date_range.start, date_range.end
            )
            qualified = self.repo.count_qualified_leads(
                ctx.tenant.id, filters, date_range.start, date_range.end
            )
            prev_leads = self.repo.count_leads_created(
                ctx.tenant.id, scope, prev_start, prev_end
            )
            converted = self.repo.count_lead_conversions(
                ctx.tenant.id, scope, date_range.start, date_range.end
            )
            conv_rate = round(converted / new_leads * 100, 1) if new_leads else None
            kpis.extend(
                [
                    AnalyticsKpiCard(
                        key="new_leads",
                        label="New Leads",
                        value=new_leads,
                        formatted_value=str(new_leads),
                        growth_percent=self._growth(new_leads, prev_leads),
                        href_path=f"/{slug}/leads",
                    ),
                    AnalyticsKpiCard(
                        key="qualified_leads",
                        label="Qualified Leads",
                        value=qualified,
                        formatted_value=str(qualified),
                        href_path=f"/{slug}/leads?status=qualified",
                    ),
                    AnalyticsKpiCard(
                        key="conversion_rate",
                        label="Conversion Rate",
                        value=int(conv_rate or 0),
                        formatted_value=f"{conv_rate or 0}%",
                    ),
                ]
            )

        if "task:read" in permissions:
            summary = self.repo.get_task_summary(ctx.tenant.id, ctx.membership.user_id)
            kpis.extend(
                [
                    AnalyticsKpiCard(
                        key="tasks_due_today",
                        label="Tasks Due Today",
                        value=summary.my_due_today,
                        formatted_value=str(summary.my_due_today),
                        href_path=f"/{slug}/tasks?due=today",
                    ),
                ]
            )

        if "activity:read" in permissions:
            activities_count = self.repo.count_activities(
                ctx.tenant.id, scope, date_range.start, date_range.end
            )
            prev_activities = self.repo.count_activities(
                ctx.tenant.id, scope, prev_start, prev_end
            )
            today_start = datetime.combine(date_range.end_date, time.min, tzinfo=resolve_timezone(date_range.timezone)).astimezone(UTC)
            today_end = today_start + timedelta(days=1)
            meetings = self.repo.count_meetings_today(
                ctx.tenant.id, filters, today_start, today_end
            )
            kpis.extend(
                [
                    AnalyticsKpiCard(
                        key="meetings_today",
                        label="Meetings Today",
                        value=meetings,
                        formatted_value=str(meetings),
                        href_path=f"/{slug}/activities",
                    ),
                    AnalyticsKpiCard(
                        key="open_activities",
                        label="Open Activities",
                        value=activities_count,
                        formatted_value=str(activities_count),
                        growth_percent=self._growth(activities_count, prev_activities),
                        href_path=f"/{slug}/activities",
                    ),
                ]
            )

        recent_activities: list[DashboardActivityItem] = []
        if "activity:read" in permissions:
            recent_activities = self.dashboard._build_recent_activities(ctx, permissions)

        upcoming_tasks: list[DashboardUpcomingTask] = []
        if "task:read" in permissions:
            upcoming_tasks = self.dashboard._build_upcoming_tasks(
                ctx.tenant.id, scope, permissions
            )

        recent_deals: list[DashboardEntityRef] = []
        if "deal:read" in permissions:
            for deal in self.repo.get_recent_deals(ctx.tenant.id, filters):
                recent_deals.append(
                    DashboardEntityRef(
                        entity_type="deal",
                        entity_id=deal.id,
                        display_name=deal.title,
                        href_path=f"/{slug}/deals/{deal.id}",
                    )
                )

        recent_companies: list[DashboardEntityRef] = []
        if "company:read" in permissions:
            for company in self.repo.get_recent_companies(ctx.tenant.id):
                recent_companies.append(
                    DashboardEntityRef(
                        entity_type="company",
                        entity_id=company.id,
                        display_name=company.company_name,
                        href_path=f"/{slug}/companies/{company.id}",
                    )
                )

        latest_contacts: list[DashboardEntityRef] = []
        if "contact:read" in permissions:
            for contact in self.repo.get_recent_contacts(ctx.tenant.id):
                name = f"{contact.first_name} {contact.last_name}".strip() or contact.email or "Contact"
                latest_contacts.append(
                    DashboardEntityRef(
                        entity_type="contact",
                        entity_id=contact.id,
                        display_name=name,
                        href_path=f"/{slug}/contacts/{contact.id}",
                    )
                )

        upcoming_meetings: list[DashboardActivityItem] = []
        if "activity:read" in permissions:
            meeting_end = date_range.end + timedelta(days=7)
            for meeting in self.repo.get_upcoming_meetings(
                ctx.tenant.id, filters, date_range.start, meeting_end
            ):
                creator = None
                if meeting.created_by:
                    creator = DashboardPersonRef(
                        id=meeting.created_by.id,
                        full_name=meeting.created_by.full_name,
                    )
                upcoming_meetings.append(
                    DashboardActivityItem(
                        id=meeting.id,
                        activity_type=meeting.activity_type,
                        action=meeting.action,
                        title=meeting.title,
                        icon=meeting.icon,
                        color=meeting.color,
                        description=meeting.description,
                        created_at=meeting.created_at,
                        scheduled_at=meeting.scheduled_at,
                        created_by=creator,
                        entity=None,
                    )
                )

        return AnalyticsOverviewResponse(
            meta=self._meta(params, date_range),
            kpis=kpis,
            recent_activities=recent_activities,
            upcoming_tasks=upcoming_tasks,
            recent_deals=recent_deals,
            recent_companies=recent_companies,
            latest_contacts=latest_contacts,
            upcoming_meetings=upcoming_meetings,
        )

    def get_revenue(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsRevenueResponse:
        date_range = self._resolve_date_range(params)
        scope = self._scope(params, ctx.membership.user_id)
        dash_params = self._to_dashboard_params(params)
        dr = self.dashboard._resolve_date_range(dash_params)
        revenue = self.dashboard._build_revenue(ctx.tenant.id, scope, dr, dash_params)
        today = date_range.end_date
        monthly = self.repo.get_monthly_revenue(ctx.tenant.id, scope, today.year, today.month)
        annual = self.repo.get_annual_revenue(ctx.tenant.id, scope, today.year)
        won, lost = self.repo.get_win_loss_counts(
            ctx.tenant.id, scope, date_range.start, date_range.end
        )
        win_rate = round(won / (won + lost) * 100, 1) if won + lost > 0 else None
        loss_rate = round(lost / (won + lost) * 100, 1) if won + lost > 0 else None
        return AnalyticsRevenueResponse(
            meta=self._meta(params, date_range),
            revenue=revenue,
            monthly_revenue=monthly,
            annual_revenue=annual,
            average_deal_value=revenue.average_deal_size,
            win_rate=win_rate,
            loss_rate=loss_rate,
        )

    def get_pipeline(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsPipelineResponse:
        date_range = self._resolve_date_range(params)
        filters = self._filters(params, ctx.membership.user_id)
        stages, lost_count, lost_value, total_open_count, total_open_value = (
            self.repo.get_funnel_stages_filtered(ctx.tenant.id, filters)
        )
        total_count = sum(s.count for s in stages) or 1
        funnel = DashboardFunnel(
            stages=[
                DashboardFunnelStage(
                    slug=s.stage,
                    label=DEAL_STAGE_LABELS.get(s.stage, s.stage.title()),
                    count=s.count,
                    value=s.value,
                    percent_of_total=round(s.count / total_count * 100, 1),
                )
                for s in stages
            ],
            lost_count=lost_count,
            lost_value=lost_value,
            total_open_count=total_open_count,
            total_open_value=total_open_value,
        )
        deals_by_stage = self.repo.get_deals_by_stage(ctx.tenant.id, filters)
        return AnalyticsPipelineResponse(
            meta=self._meta(params, date_range),
            funnel=funnel,
            pipeline_value=total_open_value,
            deals_by_stage=deals_by_stage,
        )

    def get_leads(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsLeadsResponse:
        date_range = self._resolve_date_range(params)
        scope = self._scope(params, ctx.membership.user_id)
        filters = self._filters(params, ctx.membership.user_id)
        dash_params = self._to_dashboard_params(params)
        dr = self.dashboard._resolve_date_range(dash_params)
        leads = self.dashboard._build_lead_analytics(ctx.tenant.id, scope, dr)
        new_leads = self.repo.count_leads_created(
            ctx.tenant.id, scope, date_range.start, date_range.end
        )
        qualified = self.repo.count_qualified_leads(
            ctx.tenant.id, filters, date_range.start, date_range.end
        )
        return AnalyticsLeadsResponse(
            meta=self._meta(params, date_range),
            leads=leads,
            new_leads=new_leads,
            qualified_leads=qualified,
            lead_conversion_rate=leads.conversion_rate,
        )

    def get_deals(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsDealsResponse:
        date_range = self._resolve_date_range(params)
        scope = self._scope(params, ctx.membership.user_id)
        filters = self._filters(params, ctx.membership.user_id)
        won_value, won_count = self.repo.get_won_revenue(
            ctx.tenant.id, scope, date_range.start, date_range.end
        )
        lost_value, lost_count = self.repo.get_lost_revenue(
            ctx.tenant.id, filters, date_range.start, date_range.end
        )
        avg = (won_value / won_count).quantize(Decimal("0.01")) if won_count else None
        cycle = self.repo.get_average_sales_cycle_days(
            ctx.tenant.id, filters, date_range.start, date_range.end
        )
        win_rate = round(won_count / (won_count + lost_count) * 100, 1) if won_count + lost_count > 0 else None
        return AnalyticsDealsResponse(
            meta=self._meta(params, date_range),
            deals_won=won_count,
            deals_lost=lost_count,
            won_revenue=won_value,
            lost_revenue=lost_value,
            average_deal_size=avg,
            average_sales_cycle_days=cycle,
            win_rate=win_rate,
        )

    def get_tasks(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsTasksResponse:
        date_range = self._resolve_date_range(params)
        filters = self._filters(params, ctx.membership.user_id)
        summary = self.repo.get_task_summary(ctx.tenant.id, ctx.membership.user_id)
        completed, created, by_status = self.repo.get_task_completion_stats(
            ctx.tenant.id, filters, date_range.start, date_range.end
        )
        completion_rate = round(completed / created * 100, 1) if created > 0 else None
        return AnalyticsTasksResponse(
            meta=self._meta(params, date_range),
            due_today=summary.my_due_today,
            open_tasks=summary.my_open,
            overdue_tasks=summary.my_overdue,
            completed_tasks=completed,
            completion_rate=completion_rate,
            by_status=by_status,
        )

    def get_activities(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsActivitiesResponse:
        date_range = self._resolve_date_range(params)
        scope = self._scope(params, ctx.membership.user_id)
        filters = self._filters(params, ctx.membership.user_id)
        total = self.repo.count_activities(
            ctx.tenant.id, scope, date_range.start, date_range.end
        )
        open_count = self.repo.count_open_activities(
            ctx.tenant.id, filters, date_range.start, date_range.end
        )
        today_start = datetime.combine(
            date_range.end_date, time.min, tzinfo=resolve_timezone(date_range.timezone)
        ).astimezone(UTC)
        meetings = self.repo.count_meetings_today(
            ctx.tenant.id, filters, today_start, today_start + timedelta(days=1)
        )
        heatmap_rows = self.repo.get_activity_heatmap(
            ctx.tenant.id, filters, date_range.start, date_range.end
        )
        return AnalyticsActivitiesResponse(
            meta=self._meta(params, date_range),
            total_activities=total,
            open_activities=open_count,
            meetings_today=meetings,
            heatmap=[AnalyticsActivityHeatmapDay(date=d, count=c) for d, c in heatmap_rows],
        )

    def get_team(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsTeamResponse:
        date_range = self._resolve_date_range(params)
        dash_params = self._to_dashboard_params(params)
        dr = self.dashboard._resolve_date_range(dash_params)
        members = self.dashboard._build_team_performance(ctx.tenant.id, dr)
        return AnalyticsTeamResponse(meta=self._meta(params, date_range), members=members)

    def get_forecast(self, ctx: TenantContext, params: AnalyticsQueryParams) -> AnalyticsForecastResponse:
        date_range = self._resolve_date_range(params)
        filters = self._filters(params, ctx.membership.user_id)
        forecast = self.repo.get_forecast_revenue(ctx.tenant.id, filters)
        buckets_raw = self.repo.get_forecast_buckets(ctx.tenant.id, filters)
        buckets = [
            AnalyticsForecastBucket(
                period_start=b["period_start"],
                period_label=b["period_start"].strftime("%b %Y"),
                forecast_value=b["forecast_value"],
                won_value=b["won_value"],
            )
            for b in buckets_raw
        ]
        return AnalyticsForecastResponse(
            meta=self._meta(params, date_range),
            forecast_revenue=forecast,
            buckets=buckets,
        )

    def _to_dashboard_params(self, params: AnalyticsQueryParams):
        from app.schemas.dashboard import DashboardQueryParams, DashboardRange

        range_map = {
            AnalyticsRange.today: DashboardRange.today,
            AnalyticsRange.last_7_days: DashboardRange.last_7_days,
            AnalyticsRange.last_30_days: DashboardRange.last_30_days,
            AnalyticsRange.this_quarter: DashboardRange.this_quarter,
            AnalyticsRange.this_year: DashboardRange.this_year,
            AnalyticsRange.custom: DashboardRange.custom,
        }
        mapped = range_map.get(params.range, DashboardRange.last_30_days)
        return DashboardQueryParams(
            range=mapped,
            start_date=params.start_date,
            end_date=params.end_date,
            scope=params.scope,
            timezone=params.timezone,
        )
