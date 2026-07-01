"""Calendar aggregation service."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.repositories.meeting_repository import MeetingRepository
from app.schemas.meeting import CalendarEventResponse, CalendarResponse, MeetingStatisticsResponse


class CalendarService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = MeetingRepository(db)

    def get_calendar(
        self,
        tenant_id: uuid.UUID,
        start: datetime,
        end: datetime,
        *,
        meeting_type: str | None = None,
        status: str | None = None,
        organizer_id: uuid.UUID | None = None,
    ) -> CalendarResponse:
        meetings = self.repo.calendar_range(
            tenant_id,
            start,
            end,
            meeting_type=meeting_type,
            status=status,
            organizer_id=organizer_id,
        )
        items = [
            CalendarEventResponse(
                id=m.id,
                title=m.title,
                meeting_type=m.meeting_type,
                status=m.status,
                priority=m.priority,
                start_datetime=m.start_datetime,
                end_datetime=m.end_datetime,
                location=m.location,
                meeting_url=m.meeting_url,
                company_id=m.company_id,
                contact_id=m.contact_id,
                lead_id=m.lead_id,
                deal_id=m.deal_id,
                organizer={
                    "id": m.organizer.id,
                    "full_name": m.organizer.full_name,
                    "email": m.organizer.email,
                }
                if m.organizer
                else None,
                participant_count=len(m.participants),
            )
            for m in meetings
        ]
        return CalendarResponse(items=items, start=start, end=end)

    def get_statistics(self, tenant_id: uuid.UUID) -> MeetingStatisticsResponse:
        stats = self.repo.statistics(tenant_id)
        return MeetingStatisticsResponse(**stats)

    def get_upcoming(self, tenant_id: uuid.UUID, limit: int = 10, user_id: uuid.UUID | None = None):
        return self.repo.upcoming(tenant_id, limit=limit, user_id=user_id)

    def get_today(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None = None):
        return self.repo.today(tenant_id, user_id=user_id)
