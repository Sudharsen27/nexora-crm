"""Read-only aggregation queries for the tenant dashboard."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Literal

from sqlalchemy import and_, case, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Activity, Contact, Deal, Lead, Task, TenantMembership, User
from app.models.lead import LEAD_SOURCES, LEAD_STATUSES
from app.schemas.task import TaskAssigneeSummary, TaskDashboardSummary

OPEN_TASK_STATUSES = ("pending", "in_progress")
OPEN_DEAL_STAGES = ("new", "qualified", "proposal", "negotiation")
FUNNEL_STAGES = ("new", "qualified", "proposal", "negotiation", "won")
CALENDAR_ACTIVITY_TYPES = ("meeting", "call")

LEAD_SOURCE_LABELS = {
    "website": "Website",
    "referral": "Referral",
    "cold_call": "Cold call",
    "email": "Email",
    "event": "Event",
    "social": "Social",
    "other": "Other",
}

LEAD_STATUS_LABELS = {
    "new": "New",
    "contacted": "Contacted",
    "qualified": "Qualified",
    "unqualified": "Unqualified",
    "converted": "Converted",
}


@dataclass(frozen=True)
class DashboardScopeFilter:
    scope: Literal["my", "team"]
    user_id: uuid.UUID

    @property
    def assignee_id(self) -> uuid.UUID | None:
        return self.user_id if self.scope == "my" else None


@dataclass(frozen=True)
class FunnelStageRow:
    stage: str
    count: int
    value: Decimal


@dataclass(frozen=True)
class RevenueBucketRow:
    bucket_start: datetime
    value: Decimal
    deal_count: int


@dataclass(frozen=True)
class LeadBucketRow:
    key: str
    count: int


@dataclass(frozen=True)
class TeamPerformanceRow:
    user_id: uuid.UUID
    full_name: str
    open_deals: int
    pipeline_value: Decimal
    open_tasks: int
    overdue_tasks: int
    activities_count: int
    won_deals_count: int
    won_revenue: Decimal


@dataclass(frozen=True)
class EntityRef:
    entity_type: str
    entity_id: uuid.UUID


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def _deal_scope_clause(self, scope: DashboardScopeFilter):
        if scope.assignee_id is None:
            return True
        return Deal.assigned_to_id == scope.assignee_id

    def _lead_scope_clause(self, scope: DashboardScopeFilter):
        if scope.assignee_id is None:
            return True
        return Lead.assigned_to_id == scope.assignee_id

    def _task_scope_clause(self, scope: DashboardScopeFilter):
        if scope.assignee_id is None:
            return True
        return Task.assigned_to_id == scope.assignee_id

    def get_task_summary(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> TaskDashboardSummary:
        today = date.today()
        open_statuses = OPEN_TASK_STATUSES

        my_open = self.db.scalar(
            select(func.count())
            .select_from(Task)
            .where(
                Task.tenant_id == tenant_id,
                Task.assigned_to_id == user_id,
                Task.status.in_(open_statuses),
            )
        ) or 0

        my_overdue = self.db.scalar(
            select(func.count())
            .select_from(Task)
            .where(
                Task.tenant_id == tenant_id,
                Task.assigned_to_id == user_id,
                Task.due_date < today,
                Task.status.in_(open_statuses),
            )
        ) or 0

        my_due_today = self.db.scalar(
            select(func.count())
            .select_from(Task)
            .where(
                Task.tenant_id == tenant_id,
                Task.assigned_to_id == user_id,
                Task.due_date == today,
                Task.status.in_(open_statuses),
            )
        ) or 0

        team_open = self.db.scalar(
            select(func.count())
            .select_from(Task)
            .where(Task.tenant_id == tenant_id, Task.status.in_(open_statuses))
        ) or 0

        team_overdue = self.db.scalar(
            select(func.count())
            .select_from(Task)
            .where(
                Task.tenant_id == tenant_id,
                Task.due_date < today,
                Task.status.in_(open_statuses),
            )
        ) or 0

        assignee_rows = self.db.execute(
            select(
                User.id,
                User.full_name,
                func.count(Task.id).filter(Task.status.in_(open_statuses)).label("open_count"),
                func.count(Task.id)
                .filter(Task.due_date < today, Task.status.in_(open_statuses))
                .label("overdue_count"),
            )
            .select_from(User)
            .join(
                TenantMembership,
                (TenantMembership.user_id == User.id) & (TenantMembership.tenant_id == tenant_id),
            )
            .outerjoin(
                Task,
                (Task.assigned_to_id == User.id) & (Task.tenant_id == tenant_id),
            )
            .where(TenantMembership.status == "active")
            .group_by(User.id, User.full_name)
            .order_by(User.full_name)
        ).all()

        by_assignee = [
            TaskAssigneeSummary(
                user_id=row.id,
                full_name=row.full_name,
                open_count=int(row.open_count or 0),
                overdue_count=int(row.overdue_count or 0),
            )
            for row in assignee_rows
            if int(row.open_count or 0) > 0 or int(row.overdue_count or 0) > 0
        ]

        return TaskDashboardSummary(
            my_open=my_open,
            my_overdue=my_overdue,
            my_due_today=my_due_today,
            team_open=team_open,
            team_overdue=team_overdue,
            by_assignee=by_assignee,
        )

    def get_pipeline_aggregate(
        self, tenant_id: uuid.UUID, scope: DashboardScopeFilter
    ) -> tuple[Decimal, int]:
        value = self.db.scalar(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.stage.in_(OPEN_DEAL_STAGES),
                self._deal_scope_clause(scope),
            )
        ) or Decimal("0")
        count = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage.in_(OPEN_DEAL_STAGES),
                self._deal_scope_clause(scope),
            )
        ) or 0
        return Decimal(str(value)), int(count)

    def get_won_revenue(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start: datetime,
        end: datetime,
    ) -> tuple[Decimal, int]:
        value = self.db.scalar(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "won",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_scope_clause(scope),
            )
        ) or Decimal("0")
        count = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "won",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_scope_clause(scope),
            )
        ) or 0
        return Decimal(str(value)), int(count)

    def get_funnel_stages(
        self, tenant_id: uuid.UUID, scope: DashboardScopeFilter
    ) -> tuple[list[FunnelStageRow], int, Decimal, int, Decimal]:
        rows = self.db.execute(
            select(Deal.stage, func.count(), func.coalesce(func.sum(Deal.value), 0))
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage.in_(FUNNEL_STAGES),
                self._deal_scope_clause(scope),
            )
            .group_by(Deal.stage)
        ).all()

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
                self._deal_scope_clause(scope),
            )
        ) or 0
        lost_value = self.db.scalar(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "lost",
                self._deal_scope_clause(scope),
            )
        ) or Decimal("0")

        total_open_count = sum(s.count for s in stages if s.stage in OPEN_DEAL_STAGES)
        total_open_value = sum(
            (s.value for s in stages if s.stage in OPEN_DEAL_STAGES), Decimal("0")
        )

        return stages, int(lost_count), Decimal(str(lost_value)), total_open_count, total_open_value

    def get_revenue_buckets(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start: datetime,
        end: datetime,
        granularity: Literal["day", "week", "month"],
    ) -> list[RevenueBucketRow]:
        bucket = func.date_trunc(granularity, Deal.closed_at)
        rows = self.db.execute(
            select(bucket, func.coalesce(func.sum(Deal.value), 0), func.count())
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "won",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_scope_clause(scope),
            )
            .group_by(bucket)
            .order_by(bucket)
        ).all()

        return [
            RevenueBucketRow(
                bucket_start=row[0],
                value=Decimal(str(row[1])),
                deal_count=int(row[2]),
            )
            for row in rows
            if row[0] is not None
        ]

    def get_win_loss_counts(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start: datetime,
        end: datetime,
    ) -> tuple[int, int]:
        won = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "won",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_scope_clause(scope),
            )
        ) or 0
        lost = self.db.scalar(
            select(func.count())
            .select_from(Deal)
            .where(
                Deal.tenant_id == tenant_id,
                Deal.stage == "lost",
                Deal.closed_at.isnot(None),
                Deal.closed_at >= start,
                Deal.closed_at < end,
                self._deal_scope_clause(scope),
            )
        ) or 0
        return int(won), int(lost)

    def count_leads_created(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start: datetime,
        end: datetime,
    ) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(Lead)
                .where(
                    Lead.tenant_id == tenant_id,
                    Lead.created_at >= start,
                    Lead.created_at < end,
                    self._lead_scope_clause(scope),
                )
            )
            or 0
        )

    def get_leads_by_source(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start: datetime,
        end: datetime,
    ) -> list[LeadBucketRow]:
        key_expr = func.coalesce(Lead.source, "unknown")
        rows = self.db.execute(
            select(key_expr, func.count())
            .where(
                Lead.tenant_id == tenant_id,
                Lead.created_at >= start,
                Lead.created_at < end,
                self._lead_scope_clause(scope),
            )
            .group_by(key_expr)
            .order_by(desc(func.count()))
        ).all()
        return [LeadBucketRow(key=str(row[0]), count=int(row[1])) for row in rows]

    def get_leads_by_status(
        self, tenant_id: uuid.UUID, scope: DashboardScopeFilter
    ) -> list[LeadBucketRow]:
        rows = self.db.execute(
            select(Lead.status, func.count())
            .where(
                Lead.tenant_id == tenant_id,
                Lead.status != "converted",
                self._lead_scope_clause(scope),
            )
            .group_by(Lead.status)
            .order_by(Lead.status)
        ).all()
        return [LeadBucketRow(key=str(row[0]), count=int(row[1])) for row in rows]

    def count_lead_conversions(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start: datetime,
        end: datetime,
    ) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(Lead)
                .where(
                    Lead.tenant_id == tenant_id,
                    Lead.status == "converted",
                    Lead.updated_at >= start,
                    Lead.updated_at < end,
                    self._lead_scope_clause(scope),
                )
            )
            or 0
        )

    def count_activities(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start: datetime,
        end: datetime,
    ) -> int:
        query = select(func.count()).select_from(Activity).where(
            Activity.tenant_id == tenant_id,
            Activity.created_at >= start,
            Activity.created_at < end,
        )
        if scope.assignee_id is not None:
            query = query.where(Activity.created_by_id == scope.assignee_id)
        return int(self.db.scalar(query) or 0)

    def get_recent_activities(self, tenant_id: uuid.UUID, limit: int = 15) -> list[Activity]:
        return list(
            self.db.scalars(
                select(Activity)
                .options(joinedload(Activity.created_by))
                .where(Activity.tenant_id == tenant_id)
                .order_by(desc(Activity.created_at))
                .limit(limit)
            ).all()
        )

    def get_upcoming_tasks(
        self, tenant_id: uuid.UUID, scope: DashboardScopeFilter, limit: int = 8
    ) -> list[Task]:
        today = date.today()
        end_date = today + timedelta(days=7)
        priority_order = case(
            (Task.priority == "urgent", 0),
            (Task.priority == "high", 1),
            (Task.priority == "medium", 2),
            else_=3,
        )
        query = (
            select(Task)
            .options(joinedload(Task.assigned_to))
            .where(
                Task.tenant_id == tenant_id,
                Task.status.in_(OPEN_TASK_STATUSES),
                Task.due_date.isnot(None),
                or_(
                    Task.due_date < today,
                    and_(Task.due_date >= today, Task.due_date <= end_date),
                ),
                self._task_scope_clause(scope),
            )
            .order_by(
                case((Task.due_date < today, 0), else_=1),
                Task.due_date.asc(),
                priority_order,
                Task.created_at,
            )
            .limit(limit)
        )
        return list(self.db.scalars(query).all())

    def get_calendar_tasks(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start_date: date,
        end_date: date,
    ) -> list[Task]:
        query = (
            select(Task)
            .where(
                Task.tenant_id == tenant_id,
                Task.status.in_(OPEN_TASK_STATUSES),
                Task.due_date.isnot(None),
                Task.due_date >= start_date,
                Task.due_date <= end_date,
                self._task_scope_clause(scope),
            )
            .order_by(Task.due_date, Task.title)
        )
        return list(self.db.scalars(query).all())

    def get_calendar_activities(
        self,
        tenant_id: uuid.UUID,
        scope: DashboardScopeFilter,
        start: datetime,
        end: datetime,
    ) -> list[Activity]:
        query = (
            select(Activity)
            .where(
                Activity.tenant_id == tenant_id,
                Activity.activity_type.in_(CALENDAR_ACTIVITY_TYPES),
                Activity.scheduled_at.isnot(None),
                Activity.scheduled_at >= start,
                Activity.scheduled_at < end,
            )
            .order_by(Activity.scheduled_at)
        )
        if scope.assignee_id is not None:
            query = query.where(Activity.created_by_id == scope.assignee_id)
        return list(self.db.scalars(query).all())

    def get_team_performance(
        self,
        tenant_id: uuid.UUID,
        start: datetime,
        end: datetime,
    ) -> list[TeamPerformanceRow]:
        today = date.today()
        members = self.db.execute(
            select(User.id, User.full_name)
            .join(
                TenantMembership,
                and_(
                    TenantMembership.user_id == User.id,
                    TenantMembership.tenant_id == tenant_id,
                    TenantMembership.status == "active",
                ),
            )
            .order_by(User.full_name)
        ).all()
        if not members:
            return []

        member_ids = [row.id for row in members]
        stats: dict[uuid.UUID, dict] = {
            row.id: {
                "full_name": row.full_name,
                "open_deals": 0,
                "pipeline_value": Decimal("0"),
                "open_tasks": 0,
                "overdue_tasks": 0,
                "activities_count": 0,
                "won_deals_count": 0,
                "won_revenue": Decimal("0"),
            }
            for row in members
        }

        deal_rows = self.db.execute(
            select(
                Deal.assigned_to_id,
                func.count().filter(Deal.stage.in_(OPEN_DEAL_STAGES)).label("open_deals"),
                func.coalesce(
                    func.sum(case((Deal.stage.in_(OPEN_DEAL_STAGES), Deal.value), else_=0)), 0
                ).label("pipeline_value"),
                func.count()
                .filter(
                    Deal.stage == "won",
                    Deal.closed_at.isnot(None),
                    Deal.closed_at >= start,
                    Deal.closed_at < end,
                )
                .label("won_deals_count"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                and_(
                                    Deal.stage == "won",
                                    Deal.closed_at.isnot(None),
                                    Deal.closed_at >= start,
                                    Deal.closed_at < end,
                                ),
                                Deal.value,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("won_revenue"),
            )
            .where(Deal.tenant_id == tenant_id, Deal.assigned_to_id.in_(member_ids))
            .group_by(Deal.assigned_to_id)
        ).all()
        for row in deal_rows:
            if row.assigned_to_id not in stats:
                continue
            entry = stats[row.assigned_to_id]
            entry["open_deals"] = int(row.open_deals or 0)
            entry["pipeline_value"] = Decimal(str(row.pipeline_value or 0))
            entry["won_deals_count"] = int(row.won_deals_count or 0)
            entry["won_revenue"] = Decimal(str(row.won_revenue or 0))

        task_rows = self.db.execute(
            select(
                Task.assigned_to_id,
                func.count().filter(Task.status.in_(OPEN_TASK_STATUSES)).label("open_tasks"),
                func.count()
                .filter(Task.status.in_(OPEN_TASK_STATUSES), Task.due_date < today)
                .label("overdue_tasks"),
            )
            .where(Task.tenant_id == tenant_id, Task.assigned_to_id.in_(member_ids))
            .group_by(Task.assigned_to_id)
        ).all()
        for row in task_rows:
            if row.assigned_to_id not in stats:
                continue
            entry = stats[row.assigned_to_id]
            entry["open_tasks"] = int(row.open_tasks or 0)
            entry["overdue_tasks"] = int(row.overdue_tasks or 0)

        activity_rows = self.db.execute(
            select(Activity.created_by_id, func.count())
            .where(
                Activity.tenant_id == tenant_id,
                Activity.created_by_id.in_(member_ids),
                Activity.created_at >= start,
                Activity.created_at < end,
            )
            .group_by(Activity.created_by_id)
        ).all()
        for user_id, count in activity_rows:
            if user_id not in stats:
                continue
            stats[user_id]["activities_count"] = int(count)

        results: list[TeamPerformanceRow] = []
        for user_id, entry in stats.items():
            if not any(
                [
                    entry["open_deals"],
                    entry["open_tasks"],
                    entry["overdue_tasks"],
                    entry["activities_count"],
                    entry["won_deals_count"],
                    entry["won_revenue"] > 0,
                    entry["pipeline_value"] > 0,
                ]
            ):
                continue
            results.append(
                TeamPerformanceRow(
                    user_id=user_id,
                    full_name=entry["full_name"],
                    open_deals=entry["open_deals"],
                    pipeline_value=entry["pipeline_value"],
                    open_tasks=entry["open_tasks"],
                    overdue_tasks=entry["overdue_tasks"],
                    activities_count=entry["activities_count"],
                    won_deals_count=entry["won_deals_count"],
                    won_revenue=entry["won_revenue"],
                )
            )
        results.sort(key=lambda row: (-row.overdue_tasks, row.full_name))
        return results

    def resolve_entity_names(
        self, tenant_id: uuid.UUID, refs: list[EntityRef]
    ) -> dict[tuple[str, uuid.UUID], str]:
        if not refs:
            return {}

        names: dict[tuple[str, uuid.UUID], str] = {}
        lead_ids = [r.entity_id for r in refs if r.entity_type == "lead"]
        contact_ids = [r.entity_id for r in refs if r.entity_type == "contact"]
        deal_ids = [r.entity_id for r in refs if r.entity_type == "deal"]

        if lead_ids:
            leads = self.db.scalars(
                select(Lead).where(Lead.tenant_id == tenant_id, Lead.id.in_(lead_ids))
            ).all()
            for lead in leads:
                label = f"{lead.first_name} {lead.last_name}".strip()
                names[("lead", lead.id)] = label or lead.email or "Lead"

        if contact_ids:
            contacts = self.db.scalars(
                select(Contact).where(Contact.tenant_id == tenant_id, Contact.id.in_(contact_ids))
            ).all()
            for contact in contacts:
                label = f"{contact.first_name} {contact.last_name}".strip()
                names[("contact", contact.id)] = label or contact.email or "Contact"

        if deal_ids:
            deals = self.db.scalars(
                select(Deal).where(Deal.tenant_id == tenant_id, Deal.id.in_(deal_ids))
            ).all()
            for deal in deals:
                names[("deal", deal.id)] = deal.title

        return names

    @staticmethod
    def lead_source_label(key: str) -> str:
        if key == "unknown":
            return "Unknown"
        return LEAD_SOURCE_LABELS.get(key, key.replace("_", " ").title())

    @staticmethod
    def lead_status_label(key: str) -> str:
        return LEAD_STATUS_LABELS.get(key, key.replace("_", " ").title())

    @staticmethod
    def funnel_stage_order() -> tuple[str, ...]:
        return FUNNEL_STAGES

    @staticmethod
    def known_lead_sources() -> tuple[str, ...]:
        return LEAD_SOURCES

    @staticmethod
    def known_lead_statuses() -> tuple[str, ...]:
        return LEAD_STATUSES

    @staticmethod
    def deal_stage_labels() -> dict[str, str]:
        from app.models.deal import DEAL_STAGE_LABELS

        return DEAL_STAGE_LABELS
