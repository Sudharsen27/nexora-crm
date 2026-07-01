from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.meeting import CalendarResponse, MeetingStatisticsResponse
from app.services.calendar_service import CalendarService

router = APIRouter(prefix="/tenants/{slug}/calendar", tags=["calendar"])


@router.get("", response_model=CalendarResponse)
def get_calendar(
    start: datetime = Query(...),
    end: datetime = Query(...),
    meeting_type: str | None = Query(default=None, max_length=50),
    status: str | None = Query(default=None, max_length=30),
    organizer_id: UUID | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("meeting:read")),
    db: Session = Depends(get_db),
) -> CalendarResponse:
    return CalendarService(db).get_calendar(
        ctx.tenant.id,
        start,
        end,
        meeting_type=meeting_type,
        status=status,
        organizer_id=organizer_id,
    )


@router.get("/statistics", response_model=MeetingStatisticsResponse)
def calendar_statistics(
    ctx: TenantContext = Depends(require_permission("meeting:read")),
    db: Session = Depends(get_db),
) -> MeetingStatisticsResponse:
    return CalendarService(db).get_statistics(ctx.tenant.id)
