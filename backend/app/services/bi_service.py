"""Business Intelligence orchestration — dashboards, reports, forecasts, KPIs."""

from __future__ import annotations

import csv
import io
import logging
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import TenantContext
from app.db.mixins import utcnow
from app.models.bi import (
    BiDashboard,
    BiDashboardWidget,
    BiForecast,
    BiKpi,
    BiMetric,
    BiReport,
    BiReportTemplate,
    BiScheduledReport,
)
from app.models.deal import OPEN_DEAL_STAGES, Deal
from app.schemas.analytics import AnalyticsQueryParams, AnalyticsRange
from app.schemas.bi import (
    BiDashboardCreate,
    BiDashboardDetail,
    BiDashboardSummary,
    BiDashboardUpdate,
    BiExecutiveSummary,
    BiForecastResponse,
    BiKpiCreate,
    BiKpiResponse,
    BiMetricResponse,
    BiReportCreate,
    BiReportDetail,
    BiReportRunResult,
    BiReportSummary,
    BiReportUpdate,
    BiScheduleCreate,
    BiScheduleResponse,
    BiTemplateSummary,
    BiWidgetCreate,
    BiWidgetResponse,
)
from app.schemas.dashboard import DashboardScope
from app.services.activity_logger import ActivityLogger
from app.services.analytics_service import AnalyticsService
from app.services.notification_hooks import notify_user

logger = logging.getLogger(__name__)


def _json_safe(value: Any) -> Any:
    """Recursively coerce values for JSONB persistence."""
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


SYSTEM_METRICS: list[dict[str, Any]] = [
    {"key": "total_revenue", "label": "Total Revenue", "source_entity": "deals", "aggregation": "sum", "field": "value"},
    {"key": "open_deals", "label": "Open Deals", "source_entity": "deals", "aggregation": "count", "filters": {"stage": "open"}},
    {"key": "won_deals", "label": "Won Deals", "source_entity": "deals", "aggregation": "count", "filters": {"stage": "won"}},
    {"key": "total_leads", "label": "Total Leads", "source_entity": "leads", "aggregation": "count"},
    {"key": "conversion_rate", "label": "Conversion Rate", "source_entity": "deals", "aggregation": "rate"},
    {"key": "pipeline_value", "label": "Pipeline Value", "source_entity": "deals", "aggregation": "sum", "field": "value", "filters": {"stage": "open"}},
    {"key": "meetings_count", "label": "Meetings", "source_entity": "meetings", "aggregation": "count"},
    {"key": "tasks_completed", "label": "Tasks Completed", "source_entity": "tasks", "aggregation": "count", "filters": {"status": "done"}},
]

SYSTEM_TEMPLATES: list[dict[str, Any]] = [
    {
        "name": "Pipeline by Stage",
        "category": "sales",
        "description": "Deal count and value grouped by pipeline stage",
        "config": {"metric_key": "deals_by_stage", "chart_type": "bar", "group_by": "stage"},
    },
    {
        "name": "Revenue Trend",
        "category": "revenue",
        "description": "Monthly won deal revenue",
        "config": {"metric_key": "revenue_trend", "chart_type": "area", "date_range": "last_12_months"},
    },
    {
        "name": "Lead Sources",
        "category": "marketing",
        "description": "Leads grouped by source",
        "config": {"metric_key": "leads_by_source", "chart_type": "pie", "group_by": "source"},
    },
    {
        "name": "Team Performance",
        "category": "team",
        "description": "Deals and revenue by sales rep",
        "config": {"metric_key": "team_performance", "chart_type": "horizontal_bar"},
    },
]


class BiService:
    def __init__(self, db: Session):
        self.db = db
        self.analytics = AnalyticsService(db)

    def _default_params(self) -> AnalyticsQueryParams:
        return AnalyticsQueryParams(range=AnalyticsRange.last_30_days, scope=DashboardScope.team)

    def _log(
        self,
        ctx: TenantContext,
        action: str,
        title: str,
        description: str | None = None,
        entity_type: str = "report",
        entity_id: uuid.UUID | None = None,
        **meta: Any,
    ) -> None:
        resolved_id = entity_id
        if resolved_id is None and meta.get("dashboard_id"):
            resolved_id = uuid.UUID(str(meta["dashboard_id"]))
        elif resolved_id is None and meta.get("report_id"):
            resolved_id = uuid.UUID(str(meta["report_id"]))
        else:
            resolved_id = resolved_id or ctx.tenant.id
        ActivityLogger(self.db).log(
            tenant_id=ctx.tenant.id,
            actor_id=ctx.membership.user_id,
            entity_type=entity_type,
            entity_id=resolved_id,
            action=action,
            title=title,
            description=description or title,
            metadata=meta,
        )

    def ensure_tenant_defaults(self, ctx: TenantContext) -> None:
        tid = ctx.tenant.id
        for m in SYSTEM_METRICS:
            exists = self.db.scalar(
                select(BiMetric).where(BiMetric.tenant_id == tid, BiMetric.key == m["key"])
            )
            if exists is None:
                self.db.add(BiMetric(tenant_id=tid, is_system=True, **m))
        for t in SYSTEM_TEMPLATES:
            exists = self.db.scalar(
                select(BiReportTemplate).where(
                    BiReportTemplate.tenant_id.is_(None),
                    BiReportTemplate.name == t["name"],
                    BiReportTemplate.is_system.is_(True),
                )
            )
            if exists is None:
                self.db.add(
                    BiReportTemplate(
                        tenant_id=None,
                        name=t["name"],
                        category=t["category"],
                        description=t["description"],
                        config=t["config"],
                        is_system=True,
                    )
                )
        exec_dash = self.db.scalar(
            select(BiDashboard).where(BiDashboard.tenant_id == tid, BiDashboard.is_executive.is_(True))
        )
        if exec_dash is None:
            dash = BiDashboard(
                tenant_id=tid,
                owner_id=ctx.membership.user_id,
                name="Executive Dashboard",
                description="Default executive overview",
                visibility="team",
                is_executive=True,
                layout={"columns": 12},
            )
            self.db.add(dash)
            self.db.flush()
            defaults = [
                ("Revenue", "kpi", "total_revenue", 0, 0, 3, 1),
                ("Pipeline", "kpi", "pipeline_value", 3, 0, 3, 1),
                ("Open Deals", "kpi", "open_deals", 6, 0, 3, 1),
                ("Win Rate", "kpi", "conversion_rate", 9, 0, 3, 1),
                ("Revenue Trend", "area", "revenue_trend", 0, 1, 6, 2),
                ("Pipeline Funnel", "funnel", "deals_by_stage", 6, 1, 6, 2),
                ("Team Performance", "bar", "team_performance", 0, 3, 6, 2),
                ("AI Summary", "ai_summary", None, 6, 3, 6, 2),
            ]
            for i, (title, wtype, metric, x, y, w, h) in enumerate(defaults):
                self.db.add(
                    BiDashboardWidget(
                        dashboard_id=dash.id,
                        tenant_id=tid,
                        title=title,
                        widget_type=wtype,
                        metric_key=metric,
                        position_x=x,
                        position_y=y,
                        width=w,
                        height=h,
                        sort_order=i,
                    )
                )
        self.db.commit()

    def get_executive(self, ctx: TenantContext, params: AnalyticsQueryParams | None = None) -> BiExecutiveSummary:
        self.ensure_tenant_defaults(ctx)
        p = params or self._default_params()
        overview = self.analytics.get_overview(ctx, p)
        revenue = self.analytics.get_revenue(ctx, p)
        pipeline = self.analytics.get_pipeline(ctx, p)
        team = self.analytics.get_team(ctx, p)
        forecast = self.analytics.get_forecast(ctx, p)

        dash = self.db.scalar(
            select(BiDashboard)
            .options(joinedload(BiDashboard.widgets))
            .where(BiDashboard.tenant_id == ctx.tenant.id, BiDashboard.is_executive.is_(True))
        )
        widgets: list[BiWidgetResponse] = []
        top_deals = self._top_deals(ctx)
        kpis = [
            {
                "key": k.key,
                "label": k.label,
                "value": k.formatted_value,
                "change": k.growth_percent,
                "trend": [p.model_dump() for p in k.trend],
            }
            for k in overview.kpis
        ]
        ai_summary = self._build_executive_summary(kpis, forecast, pipeline, top_deals)
        if dash:
            for w in dash.widgets:
                if w.widget_type == "ai_summary":
                    data = {"summary": ai_summary}
                else:
                    data = self._widget_data(ctx, w.metric_key, w.widget_type, p)
                widgets.append(
                    BiWidgetResponse(
                        id=w.id,
                        dashboard_id=w.dashboard_id,
                        title=w.title,
                        widget_type=w.widget_type,
                        metric_key=w.metric_key,
                        config=w.config,
                        position_x=w.position_x,
                        position_y=w.position_y,
                        width=w.width,
                        height=w.height,
                        sort_order=w.sort_order,
                        data=data,
                    )
                )

        reports = self.list_reports(ctx)[:5]
        schedules = self.list_schedules(ctx)[:5]

        return BiExecutiveSummary(
            kpis=kpis,
            widgets=widgets,
            revenue_trend=[b.model_dump() for b in revenue.revenue.buckets],
            pipeline=[s.model_dump() for s in pipeline.funnel.stages],
            top_deals=top_deals,
            team_performance=[m.model_dump() for m in team.members[:8]],
            ai_summary=ai_summary,
            recent_reports=reports,
            scheduled_reports=schedules,
            generated_at=utcnow(),
        )

    def _build_executive_summary(
        self,
        kpis: list[dict],
        forecast: Any,
        pipeline: Any,
        top_deals: list[dict],
    ) -> str:
        lines = ["**Executive Summary**\n"]
        for k in kpis[:4]:
            lines.append(f"- **{k['label']}**: {k['value']}")
        if forecast.buckets:
            predicted = forecast.forecast_revenue
            confidence = self._forecast_confidence(forecast)
            lines.append(
                f"\n**Forecast**: projected {predicted} with {confidence}% confidence."
            )
        if pipeline.funnel.stages:
            top_stage = max(pipeline.funnel.stages, key=lambda s: s.count)
            lines.append(f"**Pipeline focus**: most deals in **{top_stage.label}** ({top_stage.count}).")
        if top_deals:
            lines.append(f"**Top opportunity**: {top_deals[0]['title']} ({top_deals[0].get('value', '—')}).")
        lines.append("\nReview dashboards for drill-down into deals, team, and revenue trends.")
        return "\n".join(lines)

    def _forecast_confidence(self, forecast: Any) -> int:
        buckets = forecast.buckets or []
        if not buckets:
            return 70
        total_f = sum(float(b.forecast_value) for b in buckets)
        total_w = sum(float(b.won_value) for b in buckets)
        if total_f <= 0:
            return 65
        ratio = min(1.0, total_w / total_f)
        return int(60 + ratio * 35)

    def _top_deals(self, ctx: TenantContext, limit: int = 5) -> list[dict[str, Any]]:
        deals = self.db.scalars(
            select(Deal)
            .where(Deal.tenant_id == ctx.tenant.id, Deal.stage.in_(OPEN_DEAL_STAGES))
            .order_by(Deal.value.desc().nullslast())
            .limit(limit)
        ).all()
        return [
            {
                "id": str(d.id),
                "title": d.title,
                "stage": d.stage,
                "value": float(d.value) if d.value else None,
                "currency": d.currency,
                "probability": d.probability,
            }
            for d in deals
        ]

    def _widget_data(
        self,
        ctx: TenantContext,
        metric_key: str | None,
        widget_type: str,
        params: AnalyticsQueryParams,
    ) -> dict[str, Any]:
        if widget_type == "ai_summary":
            return {}
        if not metric_key:
            return {}
        try:
            if metric_key == "revenue_trend":
                rev = self.analytics.get_revenue(ctx, params)
                return {"series": [b.model_dump() for b in rev.revenue.buckets]}
            if metric_key == "deals_by_stage":
                pipe = self.analytics.get_pipeline(ctx, params)
                return {"series": [s.model_dump() for s in pipe.funnel.stages]}
            if metric_key == "team_performance":
                team = self.analytics.get_team(ctx, params)
                return {"series": [m.model_dump() for m in team.members]}
            if metric_key == "leads_by_source":
                leads = self.analytics.get_leads(ctx, params)
                return {"series": [b.model_dump() for b in leads.by_source]}
            overview = self.analytics.get_overview(ctx, params)
            for k in overview.kpis:
                if k.key == metric_key or metric_key in k.key:
                    return {
                        "value": k.formatted_value,
                        "change": k.growth_percent,
                        "trend": [p.model_dump() for p in k.trend],
                    }
        except Exception as exc:
            logger.warning("Widget data failed for %s: %s", metric_key, exc)
        return {}

    def list_dashboards(self, ctx: TenantContext) -> list[BiDashboardSummary]:
        q = select(BiDashboard).where(BiDashboard.tenant_id == ctx.tenant.id)
        q = q.where(
            or_(
                BiDashboard.owner_id == ctx.membership.user_id,
                BiDashboard.visibility.in_(("team", "public")),
            )
        )
        dashboards = self.db.scalars(q.order_by(BiDashboard.updated_at.desc())).all()
        result = []
        for d in dashboards:
            count = self.db.scalar(
                select(func.count()).select_from(BiDashboardWidget).where(BiDashboardWidget.dashboard_id == d.id)
            ) or 0
            result.append(
                BiDashboardSummary(
                    id=d.id,
                    name=d.name,
                    description=d.description,
                    visibility=d.visibility,
                    is_executive=d.is_executive,
                    widget_count=count,
                    updated_at=d.updated_at,
                )
            )
        return result

    def get_dashboard(self, ctx: TenantContext, dashboard_id: uuid.UUID) -> BiDashboardDetail:
        dash = self.db.scalar(
            select(BiDashboard)
            .options(joinedload(BiDashboard.widgets))
            .where(BiDashboard.id == dashboard_id, BiDashboard.tenant_id == ctx.tenant.id)
        )
        if dash is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
        self._check_dashboard_access(ctx, dash)
        params = self._default_params()
        widgets = [
            BiWidgetResponse(
                id=w.id,
                dashboard_id=w.dashboard_id,
                title=w.title,
                widget_type=w.widget_type,
                metric_key=w.metric_key,
                config=w.config,
                position_x=w.position_x,
                position_y=w.position_y,
                width=w.width,
                height=w.height,
                sort_order=w.sort_order,
                data=self._widget_data(ctx, w.metric_key, w.widget_type, params),
            )
            for w in sorted(dash.widgets, key=lambda x: x.sort_order)
        ]
        return BiDashboardDetail(
            id=dash.id,
            name=dash.name,
            description=dash.description,
            visibility=dash.visibility,
            is_executive=dash.is_executive,
            widget_count=len(widgets),
            updated_at=dash.updated_at,
            layout=dash.layout,
            filters=dash.filters,
            widgets=widgets,
        )

    def create_dashboard(self, ctx: TenantContext, payload: BiDashboardCreate) -> BiDashboardDetail:
        dash = BiDashboard(
            tenant_id=ctx.tenant.id,
            owner_id=ctx.membership.user_id,
            name=payload.name,
            description=payload.description,
            visibility=payload.visibility,
            is_executive=payload.is_executive,
            layout=payload.layout,
            filters=payload.filters,
        )
        self.db.add(dash)
        self.db.flush()
        for i, w in enumerate(payload.widgets):
            self.db.add(
                BiDashboardWidget(
                    dashboard_id=dash.id,
                    tenant_id=ctx.tenant.id,
                    title=w.title,
                    widget_type=w.widget_type,
                    metric_key=w.metric_key,
                    config=w.config,
                    position_x=w.position_x,
                    position_y=w.position_y,
                    width=w.width,
                    height=w.height,
                    sort_order=w.sort_order or i,
                )
            )
        self._log(ctx, "dashboard_created", f"Dashboard created: {dash.name}", dashboard_id=str(dash.id))
        self.db.commit()
        return self.get_dashboard(ctx, dash.id)

    def update_dashboard(
        self, ctx: TenantContext, dashboard_id: uuid.UUID, payload: BiDashboardUpdate
    ) -> BiDashboardDetail:
        dash = self.db.get(BiDashboard, dashboard_id)
        if dash is None or dash.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
        self._check_dashboard_access(ctx, dash, write=True)
        for field in ("name", "description", "visibility", "is_executive", "layout", "filters"):
            val = getattr(payload, field)
            if val is not None:
                setattr(dash, field, val)
        if payload.widgets is not None:
            for w in list(dash.widgets):
                self.db.delete(w)
            for i, w in enumerate(payload.widgets):
                self.db.add(
                    BiDashboardWidget(
                        dashboard_id=dash.id,
                        tenant_id=ctx.tenant.id,
                        title=w.title,
                        widget_type=w.widget_type,
                        metric_key=w.metric_key,
                        config=w.config,
                        position_x=w.position_x,
                        position_y=w.position_y,
                        width=w.width,
                        height=w.height,
                        sort_order=w.sort_order or i,
                    )
                )
        self._log(ctx, "dashboard_updated", f"Dashboard updated: {dash.name}")
        self.db.commit()
        return self.get_dashboard(ctx, dashboard_id)

    def delete_dashboard(self, ctx: TenantContext, dashboard_id: uuid.UUID) -> None:
        dash = self.db.get(BiDashboard, dashboard_id)
        if dash is None or dash.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
        if dash.is_executive:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete executive dashboard")
        self._check_dashboard_access(ctx, dash, write=True)
        self.db.delete(dash)
        self.db.commit()

    def duplicate_dashboard(self, ctx: TenantContext, dashboard_id: uuid.UUID) -> BiDashboardDetail:
        source = self.get_dashboard(ctx, dashboard_id)
        return self.create_dashboard(
            ctx,
            BiDashboardCreate(
                name=f"{source.name} (Copy)",
                description=source.description,
                visibility="private",
                is_executive=False,
                layout=source.layout,
                filters=source.filters,
                widgets=[
                    BiWidgetCreate(
                        title=w.title,
                        widget_type=w.widget_type,
                        metric_key=w.metric_key,
                        config=w.config,
                        position_x=w.position_x,
                        position_y=w.position_y,
                        width=w.width,
                        height=w.height,
                        sort_order=w.sort_order,
                    )
                    for w in source.widgets
                ],
            ),
        )

    def _check_dashboard_access(self, ctx: TenantContext, dash: BiDashboard, write: bool = False) -> None:
        if dash.owner_id == ctx.membership.user_id:
            return
        if dash.visibility in ("team", "public") and not write:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    def list_reports(self, ctx: TenantContext) -> list[BiReportSummary]:
        reports = self.db.scalars(
            select(BiReport)
            .where(BiReport.tenant_id == ctx.tenant.id)
            .order_by(BiReport.updated_at.desc())
        ).all()
        return [BiReportSummary.model_validate(r) for r in reports]

    def get_report(self, ctx: TenantContext, report_id: uuid.UUID) -> BiReportDetail:
        report = self.db.get(BiReport, report_id)
        if report is None or report.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        return BiReportDetail.model_validate(report)

    def create_report(self, ctx: TenantContext, payload: BiReportCreate) -> BiReportDetail:
        config = payload.config.model_dump() if hasattr(payload.config, "model_dump") else dict(payload.config)
        report = BiReport(
            tenant_id=ctx.tenant.id,
            created_by_id=ctx.membership.user_id,
            template_id=payload.template_id,
            name=payload.name,
            description=payload.description,
            chart_type=payload.chart_type,
            config=config,
        )
        self.db.add(report)
        self._log(ctx, "report_created", f"Report created: {report.name}", report_id=str(report.id))
        self.db.commit()
        self.db.refresh(report)
        return BiReportDetail.model_validate(report)

    def update_report(
        self, ctx: TenantContext, report_id: uuid.UUID, payload: BiReportUpdate
    ) -> BiReportDetail:
        report = self.db.get(BiReport, report_id)
        if report is None or report.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        for field in ("name", "description", "chart_type", "is_favorite"):
            val = getattr(payload, field)
            if val is not None:
                setattr(report, field, val)
        if payload.config is not None:
            report.config = (
                payload.config.model_dump()
                if hasattr(payload.config, "model_dump")
                else dict(payload.config)
            )
        self.db.commit()
        return BiReportDetail.model_validate(report)

    def delete_report(self, ctx: TenantContext, report_id: uuid.UUID) -> None:
        report = self.db.get(BiReport, report_id)
        if report is None or report.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        self.db.delete(report)
        self.db.commit()

    def run_report(self, ctx: TenantContext, report_id: uuid.UUID) -> BiReportRunResult:
        report = self.get_report(ctx, report_id)
        config = report.config or {}
        metric_key = config.get("metric_key", "deals_by_stage")
        params = self._default_params()
        series: list[dict[str, Any]] = []
        rows: list[dict[str, Any]] = []
        columns = ["label", "value"]

        if metric_key == "deals_by_stage":
            pipe = self.analytics.get_pipeline(ctx, params)
            for s in pipe.funnel.stages:
                row = {"label": s.label, "value": float(s.value), "count": s.count, "entity": "deals", "stage": s.slug}
                series.append(row)
                rows.append(row)
        elif metric_key == "revenue_trend":
            rev = self.analytics.get_revenue(ctx, params)
            columns = ["period", "revenue", "deals"]
            for b in rev.revenue.buckets:
                row = {"period": b.period_label, "revenue": float(b.value), "deals": b.deal_count}
                series.append(row)
                rows.append(row)
        elif metric_key == "leads_by_source":
            leads = self.analytics.get_leads(ctx, params)
            for b in leads.by_source:
                row = {"label": b.label, "value": b.count, "entity": "leads"}
                series.append(row)
                rows.append(row)
        elif metric_key == "team_performance":
            team = self.analytics.get_team(ctx, params)
            columns = ["name", "deals", "revenue", "won"]
            for m in team.members:
                row = m.model_dump()
                series.append(row)
                rows.append(row)
        else:
            overview = self.analytics.get_overview(ctx, params)
            for k in overview.kpis:
                row = {"label": k.label, "value": k.value, "key": k.key}
                series.append(row)
                rows.append(row)

        self._log(ctx, "report_generated", f"Report run: {report.name}", report_id=str(report.id))
        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            actor_id=ctx.membership.user_id,
            type="report_ready",
            title="Report ready",
            message=f"{report.name} has been generated.",
            entity_type="report",
            entity_id=report.id,
        )
        self.db.commit()

        drill = []
        entity = config.get("drill_down_entity") or "deals"
        if entity == "deals" and rows:
            drill = self._top_deals(ctx, 10)

        return BiReportRunResult(
            report_id=report.id,
            chart_type=report.chart_type,
            columns=columns,
            rows=rows,
            series=series,
            totals={"row_count": len(rows)},
            drill_down=drill,
        )

    def export_report_csv(self, ctx: TenantContext, report_id: uuid.UUID) -> str:
        result = self.run_report(ctx, report_id)
        buf = io.StringIO()
        if result.rows:
            writer = csv.DictWriter(buf, fieldnames=list(result.rows[0].keys()))
            writer.writeheader()
            writer.writerows(result.rows)
        self._log(ctx, "report_exported", "Report exported as CSV", report_id=str(report_id))
        self.db.commit()
        return buf.getvalue()

    def list_templates(self, ctx: TenantContext) -> list[BiTemplateSummary]:
        templates = self.db.scalars(
            select(BiReportTemplate).where(
                or_(BiReportTemplate.tenant_id.is_(None), BiReportTemplate.tenant_id == ctx.tenant.id)
            )
        ).all()
        return [BiTemplateSummary.model_validate(t) for t in templates]

    def list_schedules(self, ctx: TenantContext) -> list[BiScheduleResponse]:
        items = self.db.scalars(
            select(BiScheduledReport).where(BiScheduledReport.tenant_id == ctx.tenant.id)
        ).all()
        return [BiScheduleResponse.model_validate(s) for s in items]

    def create_schedule(self, ctx: TenantContext, payload: BiScheduleCreate) -> BiScheduleResponse:
        report = self.db.get(BiReport, payload.report_id)
        if report is None or report.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        sched = BiScheduledReport(
            tenant_id=ctx.tenant.id,
            report_id=payload.report_id,
            created_by_id=ctx.membership.user_id,
            frequency=payload.frequency,
            export_format=payload.export_format,
            recipients=payload.recipients,
            is_active=payload.is_active,
            next_run_at=utcnow() + timedelta(days=1),
        )
        self.db.add(sched)
        self._log(ctx, "report_scheduled", f"Scheduled report: {report.name}")
        self.db.commit()
        self.db.refresh(sched)
        return BiScheduleResponse.model_validate(sched)

    def list_kpis(self, ctx: TenantContext) -> list[BiKpiResponse]:
        self.ensure_tenant_defaults(ctx)
        kpis = self.db.scalars(select(BiKpi).where(BiKpi.tenant_id == ctx.tenant.id, BiKpi.is_active)).all()
        if not kpis:
            defaults = [
                ("revenue_target", "Revenue Target", "total_revenue", 100000, "currency"),
                ("deals_target", "Deals Target", "open_deals", 20, "number"),
            ]
            for key, label, metric, target, unit in defaults:
                self.db.add(
                    BiKpi(
                        tenant_id=ctx.tenant.id,
                        key=key,
                        label=label,
                        metric_key=metric,
                        target_value=Decimal(target),
                        unit=unit,
                    )
                )
            self.db.commit()
            kpis = self.db.scalars(select(BiKpi).where(BiKpi.tenant_id == ctx.tenant.id)).all()

        overview = self.analytics.get_overview(ctx, self._default_params())
        value_map = {k.key: k.value for k in overview.kpis}
        result = []
        for kpi in kpis:
            current = value_map.get(kpi.metric_key)
            progress = None
            if kpi.target_value and current is not None:
                try:
                    progress = min(100.0, float(current) / float(kpi.target_value) * 100)
                except (TypeError, ValueError, ZeroDivisionError):
                    progress = None
            result.append(
                BiKpiResponse(
                    id=kpi.id,
                    key=kpi.key,
                    label=kpi.label,
                    metric_key=kpi.metric_key,
                    target_value=kpi.target_value,
                    current_value=current,
                    unit=kpi.unit,
                    progress_pct=progress,
                    description=kpi.description,
                    is_active=kpi.is_active,
                )
            )
        return result

    def create_kpi(self, ctx: TenantContext, payload: BiKpiCreate) -> BiKpiResponse:
        kpi = BiKpi(
            tenant_id=ctx.tenant.id,
            key=payload.key,
            label=payload.label,
            metric_key=payload.metric_key,
            target_value=payload.target_value,
            unit=payload.unit,
            description=payload.description,
        )
        self.db.add(kpi)
        self.db.commit()
        return self.list_kpis(ctx)[-1]

    def list_metrics(self, ctx: TenantContext) -> list[BiMetricResponse]:
        self.ensure_tenant_defaults(ctx)
        metrics = self.db.scalars(
            select(BiMetric).where(
                or_(BiMetric.tenant_id.is_(None), BiMetric.tenant_id == ctx.tenant.id)
            )
        ).all()
        return [BiMetricResponse.model_validate(m) for m in metrics]

    def generate_forecast(self, ctx: TenantContext, forecast_type: str = "revenue") -> BiForecastResponse:
        params = self._default_params()
        live = self.analytics.get_forecast(ctx, params)
        confidence = self._forecast_confidence(live)
        snapshot = BiForecast(
            tenant_id=ctx.tenant.id,
            created_by_id=ctx.membership.user_id,
            forecast_type=forecast_type,
            period_label="Next 90 days",
            predicted_value=live.forecast_revenue,
            confidence=confidence,
            data={"buckets": _json_safe([b.model_dump() for b in live.buckets])},
            ai_summary=self._forecast_narrative(live, confidence),
        )
        self.db.add(snapshot)
        self.db.flush()
        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            actor_id=ctx.membership.user_id,
            type="forecast_updated",
            title="Forecast updated",
            message=f"{forecast_type.title()} forecast has been refreshed.",
            entity_type="forecast",
            entity_id=snapshot.id,
        )
        self._log(ctx, "forecast_generated", f"Forecast generated: {forecast_type}")
        self.db.commit()
        self.db.refresh(snapshot)
        return BiForecastResponse(
            id=snapshot.id,
            forecast_type=snapshot.forecast_type,
            period_label=snapshot.period_label,
            predicted_value=snapshot.predicted_value,
            confidence=snapshot.confidence,
            data=snapshot.data,
            ai_summary=snapshot.ai_summary,
            buckets=live.buckets and _json_safe([b.model_dump() for b in live.buckets]) or [],
        )

    def _forecast_narrative(self, forecast: Any, confidence: int) -> str:
        return (
            f"Projected revenue **{forecast.forecast_revenue}** over the forecast window "
            f"with **{confidence}%** confidence based on open pipeline and historical win rates."
        )
