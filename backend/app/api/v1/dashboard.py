from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.dashboard import (
    DashboardQueryParams,
    DashboardRange,
    DashboardResponse,
    DashboardScope,
)
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/tenants/{slug}/dashboard", tags=["dashboard"])


def parse_dashboard_params(
    range: DashboardRange = Query(default=DashboardRange.last_30_days, alias="range"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    scope: DashboardScope = Query(default=DashboardScope.my),
    timezone: str = Query(default="UTC", max_length=64),
) -> DashboardQueryParams:
    try:
        return DashboardQueryParams(
            range=range,
            start_date=start_date,
            end_date=end_date,
            scope=scope,
            timezone=timezone,
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    params: DashboardQueryParams = Depends(parse_dashboard_params),
    ctx: TenantContext = Depends(require_permission("tenant:read")),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    return DashboardService(db).get_dashboard(ctx, params)
