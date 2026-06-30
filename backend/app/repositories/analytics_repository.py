"""Analytics aggregation queries — extends dashboard repository patterns."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import and_, case, desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Activity, Company, Contact, Deal, Lead, Task
from app.repositories.dashboard_repository import (
    OPEN_DEAL_STAGES,
    OPEN_TASK_STATUSES,
    DashboardRepository,
    DashboardScopeFilter,
    FunnelStageRow,
)


@dataclass(frozen=True)
class AnalyticsFilters:
    scope: DashboardScopeFilter
    owner_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    stage: str | None = None


class AnalyticsRepository(DashboardRepository):
    def _deal_filters(self, filters: AnalyticsFilters):
        clauses = [self._deal_scope_clause(filters.scope)]
        assignee = filters.owner_id or filters.scope.assignee_id
        if assignee is not None:
            clauses.append(Deal.assigned_to_id == assignee)
        if filters.company_id is not None:
            clauses.append(Deal.company_id == filters.company_id)
        if filters.stage is not None:
            clauses.append(Deal.stage == filters.stage)
        return and_(*clauses)

    def _lead_filters(self, filters: AnalyticsFilters):
        clauses = [self._lead_scope_clause(filters.scope)]
        assignee = filters.owner_id or filters.scope.assignee_id
        if assignee is not None:
            clauses.append(Lead.assigned_to_id == assignee)
        return and_(*clauses)

    def get_lost_revenue(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        start: datetime,
        end: datetime,
    ) -> tuple[Decimal, int]:
        value = self.db.scalar(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "lost",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_filters(filters),
            )
        ) or Decimal("0")
        count = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "lost",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_filters(filters),
            )
        ) or 0
        return Decimal(str(value)), int(count)

    def get_forecast_revenue(
        self, tenant_id: uuid.UUID, filters: AnalyticsFilters
    ) -> Decimal:
        value = self.db.scalar(
            select(
                func.coalesce(
                    func.sum(Deal.value * Deal.probability / 100),
                    0,
                )
            ).where(
                Deal.tenant_id == tenant_id,
                Deal.stage.in_(OPEN_DEAL_STAGES),
                self._deal_filters(filters),
            )
        ) or Decimal("0")
        return Decimal(str(value)).quantize(Decimal("0.01"))

    def count_qualified_leads(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        start: datetime,
        end: datetime,
    ) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(Lead)
                .where(
                    Lead.tenant_id == tenant_id,
                    Lead.status == "qualified",
                    Lead.created_at >= start,
                    Lead.created_at < end,
                    self._lead_filters(filters),
                )
            )
            or 0
        )

    def get_deals_by_stage(
        self, tenant_id: uuid.UUID, filters: AnalyticsFilters
    ) -> list[dict]:
        rows = self.db.execute(
            select(
                Deal.stage,
                func.count(),
                func.coalesce(func.sum(Deal.value), 0),
            )
            .where(Deal.tenant_id == tenant_id, self._deal_filters(filters))
            .group_by(Deal.stage)
            .order_by(Deal.stage)
        ).all()
        return [
            {"stage": row[0], "count": int(row[1]), "value": Decimal(str(row[2]))}
            for row in rows
        ]

    def get_average_sales_cycle_days(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        start: datetime,
        end: datetime,
    ) -> float | None:
        rows = self.db.execute(
            select(
                func.avg(
                    func.extract("epoch", Deal.closed_at - Deal.created_at) / 86400.0
                )
            ).where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "won",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_filters(filters),
            )
        ).scalar()
        return round(float(rows), 1) if rows is not None else None

    def count_meetings_today(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        day_start: datetime,
        day_end: datetime,
    ) -> int:
        query = select(func.count()).select_from(Activity).where(
            Activity.tenant_id == tenant_id,
            Activity.activity_type == "meeting",
            Activity.scheduled_at.isnot(None),
            Activity.scheduled_at >= day_start,
            Activity.scheduled_at < day_end,
        )
        assignee = filters.owner_id or filters.scope.assignee_id
        if assignee is not None:
            query = query.where(Activity.created_by_id == assignee)
        return int(self.db.scalar(query) or 0)

    def get_activity_heatmap(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        start: datetime,
        end: datetime,
    ) -> list[tuple[date, int]]:
        day_bucket = func.date_trunc("day", Activity.created_at)
        query = (
            select(day_bucket, func.count())
            .where(
                Activity.tenant_id == tenant_id,
                Activity.created_at >= start,
                Activity.created_at < end,
                Activity.archived_at.is_(None),
            )
            .group_by(day_bucket)
            .order_by(day_bucket)
        )
        assignee = filters.owner_id or filters.scope.assignee_id
        if assignee is not None:
            query = query.where(Activity.created_by_id == assignee)
        rows = self.db.execute(query).all()
        return [(row[0].date(), int(row[1])) for row in rows if row[0] is not None]

    def get_task_completion_stats(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        start: datetime,
        end: datetime,
    ) -> tuple[int, int, list[dict]]:
        assignee = filters.owner_id or filters.scope.assignee_id
        base = [Task.tenant_id == tenant_id]
        if assignee is not None:
            base.append(Task.assigned_to_id == assignee)

        completed = int(
            self.db.scalar(
                select(func.count())
                .select_from(Task)
                .where(
                    *base,
                    Task.status == "completed",
                    Task.updated_at >= start,
                    Task.updated_at < end,
                )
            )
            or 0
        )
        created = int(
            self.db.scalar(
                select(func.count())
                .select_from(Task)
                .where(*base, Task.created_at >= start, Task.created_at < end)
            )
            or 0
        )
        status_rows = self.db.execute(
            select(Task.status, func.count())
            .where(*base)
            .group_by(Task.status)
        ).all()
        by_status = [{"status": row[0], "count": int(row[1])} for row in status_rows]
        return completed, created, by_status

    def get_revenue_trend_points(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        end: datetime,
        points: int = 7,
    ) -> list[Decimal]:
        """Daily won revenue for sparklines (last N days ending at `end`)."""
        start = end - timedelta(days=points)
        day_bucket = func.date_trunc("day", Deal.closed_at)
        rows = self.db.execute(
            select(day_bucket, func.coalesce(func.sum(Deal.value), 0))
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "won",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_scope_clause(scope),
            )
            .group_by(day_bucket)
            .order_by(day_bucket)
        ).all()
        by_day = {row[0].date(): Decimal(str(row[1])) for row in rows if row[0]}
        result: list[Decimal] = []
        for i in range(points):
            d = (end - timedelta(days=points - i)).date()
            result.append(by_day.get(d, Decimal("0")))
        return result

    def get_recent_deals(
        self, tenant_id: uuid.UUID, filters: AnalyticsFilters, limit: int = 5
    ) -> list[Deal]:
        return list(
            self.db.scalars(
                select(Deal)
                .where(Deal.tenant_id == tenant_id, self._deal_filters(filters))
                .order_by(desc(Deal.created_at))
                .limit(limit)
            ).all()
        )

    def get_recent_companies(
        self, tenant_id: uuid.UUID, limit: int = 5
    ) -> list[Company]:
        return list(
            self.db.scalars(
                select(Company)
                .where(Company.tenant_id == tenant_id)
                .order_by(desc(Company.created_at))
                .limit(limit)
            ).all()
        )

    def get_recent_contacts(
        self, tenant_id: uuid.UUID, limit: int = 5
    ) -> list[Contact]:
        return list(
            self.db.scalars(
                select(Contact)
                .where(Contact.tenant_id == tenant_id)
                .order_by(desc(Contact.created_at))
                .limit(limit)
            ).all()
        )

    def get_upcoming_meetings(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        start: datetime,
        end: datetime,
        limit: int = 5,
    ) -> list[Activity]:
        query = (
            select(Activity)
            .options(joinedload(Activity.created_by))
            .where(
                Activity.tenant_id == tenant_id,
                Activity.activity_type == "meeting",
                Activity.scheduled_at.isnot(None),
                Activity.scheduled_at >= start,
                Activity.scheduled_at < end,
            )
            .order_by(Activity.scheduled_at)
            .limit(limit)
        )
        assignee = filters.owner_id or filters.scope.assignee_id
        if assignee is not None:
            query = query.where(Activity.created_by_id == assignee)
        return list(self.db.scalars(query).all())

    def get_forecast_buckets(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        months: int = 6,
    ) -> list[dict]:
        today = date.today()
        buckets: list[dict] = []
        for i in range(months):
            month_start = date(today.year, today.month, 1)
            if i > 0:
                m = today.month - i
                y = today.year
                while m <= 0:
                    m += 12
                    y -= 1
                month_start = date(y, m, 1)
            if month_start.month == 12:
                month_end = date(month_start.year + 1, 1, 1)
            else:
                month_end = date(month_start.year, month_start.month + 1, 1)
            forecast = self.db.scalar(
                select(
                    func.coalesce(
                        func.sum(Deal.value * Deal.probability / 100),
                        0,
                    )
                ).where(
                    Deal.tenant_id == tenant_id,
                    Deal.stage.in_(OPEN_DEAL_STAGES),
                    Deal.expected_close_date.isnot(None),
                    Deal.expected_close_date >= month_start,
                    Deal.expected_close_date < month_end,
                    self._deal_filters(filters),
                )
            ) or Decimal("0")
            won = self.db.scalar(
                select(func.coalesce(func.sum(Deal.value), 0)).where(
                    Deal.tenant_id == tenant_id,
                    Deal.stage == "won",
                    Deal.closed_at.isnot(None),
                    func.date(Deal.closed_at) >= month_start,
                    func.date(Deal.closed_at) < month_end,
                    self._deal_filters(filters),
                )
            ) or Decimal("0")
            buckets.append(
                {
                    "period_start": month_start,
                    "forecast_value": Decimal(str(forecast)),
                    "won_value": Decimal(str(won)),
                }
            )
        buckets.reverse()
        return buckets

    def get_funnel_stages_filtered(
        self, tenant_id: uuid.UUID, filters: AnalyticsFilters
    ) -> tuple[list[FunnelStageRow], int, Decimal, int, Decimal]:
        """Funnel with owner/company/stage filters."""
        rows = self.db.execute(
            select(Deal.stage, func.count(), func.coalesce(func.sum(Deal.value), 0))
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage.in_(("new", "qualified", "proposal", "negotiation", "won")),
                self._deal_filters(filters),
            )
            .group_by(Deal.stage)
        ).all()
        from app.repositories.dashboard_repository import FUNNEL_STAGES

        by_stage = {row[0]: (int(row[1]), Decimal(str(row[2]))) for row in rows}
        stages = [
            FunnelStageRow(
                stage=stage,
                count=by_stage.get(stage, (0, Decimal("0")))[0],
                value=by_stage.get(stage, (0, Decimal("0")))[1],
            )
            for stage in FUNNEL_STAGES
        ]
        lost_count = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "lost",
                self._deal_filters(filters),
            )
        ) or 0
        lost_value = self.db.scalar(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "lost",
                self._deal_filters(filters),
            )
        ) or Decimal("0")
        total_open_count = sum(s.count for s in stages if s.stage in OPEN_DEAL_STAGES)
        total_open_value = sum(
            (s.value for s in stages if s.stage in OPEN_DEAL_STAGES), Decimal("0")
        )
        return stages, int(lost_count), Decimal(str(lost_value)), total_open_count, total_open_value

    def count_open_activities(
        self,
        tenant_id: uuid.UUID,
        filters: AnalyticsFilters,
        start: datetime,
        end: datetime,
    ) -> int:
        query = select(func.count()).select_from(Activity).where(
            Activity.tenant_id == tenant_id,
            Activity.created_at >= start,
            Activity.created_at < end,
            Activity.archived_at.is_(None),
        )
        assignee = filters.owner_id or filters.scope.assignee_id
        if assignee is not None:
            query = query.where(Activity.created_by_id == assignee)
        return int(self.db.scalar(query) or 0)

    def get_monthly_revenue(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        year: int,
        month: int,
    ) -> Decimal:
        from datetime import datetime as dt
        from datetime import time as dt_time
        from datetime import UTC

        start = dt(year, month, 1, tzinfo=UTC)
        if month == 12:
            end = dt(year + 1, 1, 1, tzinfo=UTC)
        else:
            end = dt(year, month + 1, 1, tzinfo=UTC)
        value, _ = self.get_won_revenue(tenant_id, scope, start, end)
        return value

    def get_annual_revenue(
        self, tenant_id: uuid.UUID, scope: DashboardScopeFilter, year: int
    ) -> Decimal:
        from datetime import datetime as dt
        from datetime import UTC

        start = dt(year, 1, 1, tzinfo=UTC)
        end = dt(year + 1, 1, 1, tzinfo=UTC)
        value, _ = self.get_won_revenue(tenant_id, scope, start, end)
        return value
