from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.analytics import (
    AnalyticsActivitiesResponse,
    AnalyticsDealsResponse,
    AnalyticsForecastResponse,
    AnalyticsLeadsResponse,
    AnalyticsOverviewResponse,
    AnalyticsPipelineResponse,
    AnalyticsQueryParams,
    AnalyticsRange,
    AnalyticsRevenueResponse,
    AnalyticsTasksResponse,
    AnalyticsTeamResponse,
)
from app.schemas.dashboard import DashboardScope
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/tenants/{slug}/analytics", tags=["analytics"])


def parse_analytics_params(
    range: AnalyticsRange = Query(default=AnalyticsRange.last_30_days, alias="range"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    scope: DashboardScope = Query(default=DashboardScope.my),
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


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("tenant:read")),
    db: Session = Depends(get_db),
) -> AnalyticsOverviewResponse:
    return AnalyticsService(db).get_overview(ctx, params)


@router.get("/revenue", response_model=AnalyticsRevenueResponse)
def get_analytics_revenue(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("deal:read")),
    db: Session = Depends(get_db),
) -> AnalyticsRevenueResponse:
    return AnalyticsService(db).get_revenue(ctx, params)


@router.get("/pipeline", response_model=AnalyticsPipelineResponse)
def get_analytics_pipeline(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("deal:read")),
    db: Session = Depends(get_db),
) -> AnalyticsPipelineResponse:
    return AnalyticsService(db).get_pipeline(ctx, params)


@router.get("/leads", response_model=AnalyticsLeadsResponse)
def get_analytics_leads(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("lead:read")),
    db: Session = Depends(get_db),
) -> AnalyticsLeadsResponse:
    return AnalyticsService(db).get_leads(ctx, params)


@router.get("/deals", response_model=AnalyticsDealsResponse)
def get_analytics_deals(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("deal:read")),
    db: Session = Depends(get_db),
) -> AnalyticsDealsResponse:
    return AnalyticsService(db).get_deals(ctx, params)


@router.get("/tasks", response_model=AnalyticsTasksResponse)
def get_analytics_tasks(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("task:read")),
    db: Session = Depends(get_db),
) -> AnalyticsTasksResponse:
    return AnalyticsService(db).get_tasks(ctx, params)


@router.get("/activities", response_model=AnalyticsActivitiesResponse)
def get_analytics_activities(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> AnalyticsActivitiesResponse:
    return AnalyticsService(db).get_activities(ctx, params)


@router.get("/team", response_model=AnalyticsTeamResponse)
def get_analytics_team(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("user:read")),
    db: Session = Depends(get_db),
) -> AnalyticsTeamResponse:
    return AnalyticsService(db).get_team(ctx, params)


@router.get("/forecast", response_model=AnalyticsForecastResponse)
def get_analytics_forecast(
    params: AnalyticsQueryParams = Depends(parse_analytics_params),
    ctx: TenantContext = Depends(require_permission("deal:read")),
    db: Session = Depends(get_db),
) -> AnalyticsForecastResponse:
    return AnalyticsService(db).get_forecast(ctx, params)
