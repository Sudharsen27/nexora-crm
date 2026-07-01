from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.meeting import (
    MeetingCreate,
    MeetingListResponse,
    MeetingParticipantInput,
    MeetingReschedule,
    MeetingResponse,
    MeetingStatisticsResponse,
    MeetingStatusUpdate,
    MeetingUpdate,
)
from app.services.meeting_service import MeetingService, paginate

router = APIRouter(prefix="/tenants/{slug}/meetings", tags=["meetings"])


def _user_summary(user) -> dict | None:
    if not user:
        return None
    return {"id": user.id, "full_name": user.full_name, "email": user.email}


def _to_response(meeting) -> MeetingResponse:
    return MeetingResponse(
        id=meeting.id,
        tenant_id=meeting.tenant_id,
        title=meeting.title,
        description=meeting.description,
        agenda=meeting.agenda,
        notes=meeting.notes,
        outcome=meeting.outcome,
        meeting_type=meeting.meeting_type,
        status=meeting.status,
        priority=meeting.priority,
        start_datetime=meeting.start_datetime,
        end_datetime=meeting.end_datetime,
        timezone=meeting.timezone,
        location=meeting.location,
        meeting_url=meeting.meeting_url,
        company_id=meeting.company_id,
        contact_id=meeting.contact_id,
        lead_id=meeting.lead_id,
        deal_id=meeting.deal_id,
        task_id=meeting.task_id,
        organizer_id=meeting.organizer_id,
        organizer=_user_summary(meeting.organizer),
        created_by_id=meeting.created_by_id,
        created_by=_user_summary(meeting.created_by),
        updated_by_id=meeting.updated_by_id,
        recurrence_rule=meeting.recurrence_rule,
        meeting_metadata=meeting.meeting_metadata,
        activity_id=meeting.activity_id,
        participants=[
            {
                "id": p.id,
                "user_id": p.user_id,
                "role": p.role,
                "attendance_status": p.attendance_status,
                "user": _user_summary(p.user),
            }
            for p in meeting.participants
        ],
        reminders=[
            {"id": r.id, "remind_before_minutes": r.remind_before_minutes, "method": r.method}
            for r in meeting.reminders
        ],
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
    )


@router.get("", response_model=MeetingListResponse)
def list_meetings(
    q: str | None = Query(default=None, max_length=200),
    meeting_type: str | None = Query(default=None, max_length=50),
    status: str | None = Query(default=None, max_length=30),
    priority: str | None = Query(default=None, max_length=20),
    company_id: UUID | None = Query(default=None),
    contact_id: UUID | None = Query(default=None),
    lead_id: UUID | None = Query(default=None),
    deal_id: UUID | None = Query(default=None),
    organizer_id: UUID | None = Query(default=None),
    participant_id: UUID | None = Query(default=None),
    start_from: datetime | None = Query(default=None),
    start_to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("meeting:read")),
    db: Session = Depends(get_db),
) -> MeetingListResponse:
    items, total = MeetingService(db).list_meetings(
        ctx.tenant.id,
        q=q,
        meeting_type=meeting_type,
        status=status,
        priority=priority,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
        deal_id=deal_id,
        organizer_id=organizer_id,
        participant_id=participant_id,
        start_from=start_from,
        start_to=start_to,
        page=page,
        page_size=page_size,
    )
    return MeetingListResponse(
        items=[_to_response(m) for m in items],
        **paginate(total, page, page_size),
    )


@router.get("/upcoming", response_model=MeetingListResponse)
def upcoming_meetings(
    limit: int = Query(default=10, ge=1, le=50),
    ctx: TenantContext = Depends(require_permission("meeting:read")),
    db: Session = Depends(get_db),
) -> MeetingListResponse:
    from app.repositories.meeting_repository import MeetingRepository

    items = MeetingRepository(db).upcoming(ctx.tenant.id, limit=limit, user_id=ctx.membership.user_id)
    return MeetingListResponse(
        items=[_to_response(m) for m in items],
        total=len(items),
        page=1,
        page_size=limit,
        total_pages=1 if items else 0,
    )


@router.get("/today", response_model=MeetingListResponse)
def today_meetings(
    ctx: TenantContext = Depends(require_permission("meeting:read")),
    db: Session = Depends(get_db),
) -> MeetingListResponse:
    from app.repositories.meeting_repository import MeetingRepository

    items = MeetingRepository(db).today(ctx.tenant.id, user_id=ctx.membership.user_id)
    return MeetingListResponse(
        items=[_to_response(m) for m in items],
        total=len(items),
        page=1,
        page_size=max(len(items), 1),
        total_pages=1 if items else 0,
    )


@router.get("/statistics", response_model=MeetingStatisticsResponse)
def meeting_statistics(
    ctx: TenantContext = Depends(require_permission("meeting:read")),
    db: Session = Depends(get_db),
) -> MeetingStatisticsResponse:
    from app.services.calendar_service import CalendarService

    return CalendarService(db).get_statistics(ctx.tenant.id)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: UUID,
    ctx: TenantContext = Depends(require_permission("meeting:read")),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    return _to_response(MeetingService(db).get_meeting(ctx.tenant.id, meeting_id))


@router.post("", response_model=MeetingResponse, status_code=201)
def create_meeting(
    payload: MeetingCreate,
    ctx: TenantContext = Depends(require_permission("meeting:write")),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = MeetingService(db).create_meeting(ctx.tenant.id, payload, ctx.membership.user_id)
    return _to_response(meeting)


@router.patch("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    meeting_id: UUID,
    payload: MeetingUpdate,
    ctx: TenantContext = Depends(require_permission("meeting:write")),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = MeetingService(db).update_meeting(
        ctx.tenant.id, meeting_id, payload, ctx.membership.user_id
    )
    return _to_response(meeting)


@router.patch("/{meeting_id}/status", response_model=MeetingResponse)
def update_meeting_status(
    meeting_id: UUID,
    payload: MeetingStatusUpdate,
    ctx: TenantContext = Depends(require_permission("meeting:write")),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = MeetingService(db).update_status(
        ctx.tenant.id, meeting_id, payload, ctx.membership.user_id
    )
    return _to_response(meeting)


@router.patch("/{meeting_id}/reschedule", response_model=MeetingResponse)
def reschedule_meeting(
    meeting_id: UUID,
    payload: MeetingReschedule,
    ctx: TenantContext = Depends(require_permission("meeting:write")),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = MeetingService(db).reschedule_meeting(
        ctx.tenant.id, meeting_id, payload, ctx.membership.user_id
    )
    return _to_response(meeting)


@router.post("/{meeting_id}/duplicate", response_model=MeetingResponse, status_code=201)
def duplicate_meeting(
    meeting_id: UUID,
    ctx: TenantContext = Depends(require_permission("meeting:write")),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = MeetingService(db).duplicate_meeting(
        ctx.tenant.id, meeting_id, ctx.membership.user_id
    )
    return _to_response(meeting)


@router.post("/{meeting_id}/participants", response_model=MeetingResponse)
def add_participant(
    meeting_id: UUID,
    payload: MeetingParticipantInput,
    ctx: TenantContext = Depends(require_permission("meeting:write")),
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = MeetingService(db).add_participant(
        ctx.tenant.id,
        meeting_id,
        payload.user_id,
        payload.role,
        ctx.membership.user_id,
    )
    return _to_response(meeting)


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(
    meeting_id: UUID,
    ctx: TenantContext = Depends(require_permission("meeting:delete")),
    db: Session = Depends(get_db),
) -> None:
    MeetingService(db).delete_meeting(ctx.tenant.id, meeting_id, ctx.membership.user_id)
