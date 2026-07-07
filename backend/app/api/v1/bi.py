from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
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
)
from app.schemas.dashboard import DashboardScope
from app.services.bi_service import BiService

router = APIRouter(prefix="/tenants/{slug}/bi", tags=["business-intelligence"])


def parse_bi_params(
    range: AnalyticsRange = Query(default=AnalyticsRange.last_30_days, alias="range"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    scope: DashboardScope = Query(default=DashboardScope.team),
    timezone: str = Query(default="UTC", max_length=64),
    owner_id: UUID | None = Query(default=None),
    company_id: UUID | None = Query(default=None),
    stage: str | None = Query(default=None, max_length=32),
) -> AnalyticsQueryParams:
    try:
        return AnalyticsQueryParams(
            range=range,
            start_date=start_date,
            end_date=end_date,
            scope=scope,
            timezone=timezone,
            owner_id=owner_id,
            company_id=company_id,
            stage=stage,
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc


@router.get("/executive", response_model=BiExecutiveSummary)
def get_executive_dashboard(
    params: AnalyticsQueryParams = Depends(parse_bi_params),
    ctx: TenantContext = Depends(require_permission("bi:read")),
    db: Session = Depends(get_db),
) -> BiExecutiveSummary:
    return BiService(db).get_executive(ctx, params)


@router.get("/dashboards", response_model=list[BiDashboardSummary])
def list_dashboards(
    ctx: TenantContext = Depends(require_permission("bi:read")),
    db: Session = Depends(get_db),
) -> list[BiDashboardSummary]:
    return BiService(db).list_dashboards(ctx)


@router.post("/dashboards", response_model=BiDashboardDetail, status_code=status.HTTP_201_CREATED)
def create_dashboard(
    payload: BiDashboardCreate,
    ctx: TenantContext = Depends(require_permission("bi:write")),
    db: Session = Depends(get_db),
) -> BiDashboardDetail:
    return BiService(db).create_dashboard(ctx, payload)


@router.get("/dashboards/{dashboard_id}", response_model=BiDashboardDetail)
def get_dashboard(
    dashboard_id: UUID,
    ctx: TenantContext = Depends(require_permission("bi:read")),
    db: Session = Depends(get_db),
) -> BiDashboardDetail:
    return BiService(db).get_dashboard(ctx, dashboard_id)


@router.patch("/dashboards/{dashboard_id}", response_model=BiDashboardDetail)
def update_dashboard(
    dashboard_id: UUID,
    payload: BiDashboardUpdate,
    ctx: TenantContext = Depends(require_permission("bi:write")),
    db: Session = Depends(get_db),
) -> BiDashboardDetail:
    return BiService(db).update_dashboard(ctx, dashboard_id, payload)


@router.delete("/dashboards/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dashboard(
    dashboard_id: UUID,
    ctx: TenantContext = Depends(require_permission("bi:write")),
    db: Session = Depends(get_db),
) -> None:
    BiService(db).delete_dashboard(ctx, dashboard_id)


@router.post("/dashboards/{dashboard_id}/duplicate", response_model=BiDashboardDetail)
def duplicate_dashboard(
    dashboard_id: UUID,
    ctx: TenantContext = Depends(require_permission("bi:write")),
    db: Session = Depends(get_db),
) -> BiDashboardDetail:
    return BiService(db).duplicate_dashboard(ctx, dashboard_id)


@router.get("/reports", response_model=list[BiReportSummary])
def list_reports(
    ctx: TenantContext = Depends(require_permission("report:read")),
    db: Session = Depends(get_db),
) -> list[BiReportSummary]:
    return BiService(db).list_reports(ctx)


@router.post("/reports", response_model=BiReportDetail, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: BiReportCreate,
    ctx: TenantContext = Depends(require_permission("report:write")),
    db: Session = Depends(get_db),
) -> BiReportDetail:
    return BiService(db).create_report(ctx, payload)


@router.get("/reports/{report_id}", response_model=BiReportDetail)
def get_report(
    report_id: UUID,
    ctx: TenantContext = Depends(require_permission("report:read")),
    db: Session = Depends(get_db),
) -> BiReportDetail:
    return BiService(db).get_report(ctx, report_id)


@router.patch("/reports/{report_id}", response_model=BiReportDetail)
def update_report(
    report_id: UUID,
    payload: BiReportUpdate,
    ctx: TenantContext = Depends(require_permission("report:write")),
    db: Session = Depends(get_db),
) -> BiReportDetail:
    return BiService(db).update_report(ctx, report_id, payload)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: UUID,
    ctx: TenantContext = Depends(require_permission("report:delete")),
    db: Session = Depends(get_db),
) -> None:
    BiService(db).delete_report(ctx, report_id)


@router.post("/reports/{report_id}/run", response_model=BiReportRunResult)
def run_report(
    report_id: UUID,
    ctx: TenantContext = Depends(require_permission("report:read")),
    db: Session = Depends(get_db),
) -> BiReportRunResult:
    return BiService(db).run_report(ctx, report_id)


@router.get("/reports/{report_id}/export")
def export_report(
    report_id: UUID,
    format: str = Query(default="csv", pattern="^(csv|xlsx|pdf)$"),
    ctx: TenantContext = Depends(require_permission("report:read")),
    db: Session = Depends(get_db),
) -> Response:
    if format != "csv":
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Export format '{format}' is not yet supported. Use csv.",
        )
    content = BiService(db).export_report_csv(ctx, report_id)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="report-{report_id}.csv"'},
    )


@router.get("/templates", response_model=list[BiTemplateSummary])
def list_templates(
    ctx: TenantContext = Depends(require_permission("report:read")),
    db: Session = Depends(get_db),
) -> list[BiTemplateSummary]:
    return BiService(db).list_templates(ctx)


@router.get("/schedules", response_model=list[BiScheduleResponse])
def list_schedules(
    ctx: TenantContext = Depends(require_permission("report:read")),
    db: Session = Depends(get_db),
) -> list[BiScheduleResponse]:
    return BiService(db).list_schedules(ctx)


@router.post("/schedules", response_model=BiScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: BiScheduleCreate,
    ctx: TenantContext = Depends(require_permission("report:write")),
    db: Session = Depends(get_db),
) -> BiScheduleResponse:
    return BiService(db).create_schedule(ctx, payload)


@router.get("/kpis", response_model=list[BiKpiResponse])
def list_kpis(
    ctx: TenantContext = Depends(require_permission("bi:read")),
    db: Session = Depends(get_db),
) -> list[BiKpiResponse]:
    return BiService(db).list_kpis(ctx)


@router.post("/kpis", response_model=BiKpiResponse, status_code=status.HTTP_201_CREATED)
def create_kpi(
    payload: BiKpiCreate,
    ctx: TenantContext = Depends(require_permission("bi:write")),
    db: Session = Depends(get_db),
) -> BiKpiResponse:
    return BiService(db).create_kpi(ctx, payload)


@router.get("/metrics", response_model=list[BiMetricResponse])
def list_metrics(
    ctx: TenantContext = Depends(require_permission("bi:read")),
    db: Session = Depends(get_db),
) -> list[BiMetricResponse]:
    return BiService(db).list_metrics(ctx)


@router.post("/forecast", response_model=BiForecastResponse)
def generate_forecast(
    forecast_type: str = Query(default="revenue"),
    ctx: TenantContext = Depends(require_permission("bi:read")),
    db: Session = Depends(get_db),
) -> BiForecastResponse:
    return BiService(db).generate_forecast(ctx, forecast_type)
