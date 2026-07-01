"""Meeting persistence and calendar queries."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.meeting import Meeting, MeetingParticipant, MeetingReminder

OPEN_MEETING_STATUSES = ("scheduled", "confirmed", "in_progress")


class MeetingRepository:
    def __init__(self, db: Session):
        self.db = db

    def base_query(self, tenant_id: uuid.UUID):
        return (
            select(Meeting)
            .options(
                joinedload(Meeting.organizer),
                joinedload(Meeting.created_by),
                joinedload(Meeting.participants).joinedload(MeetingParticipant.user),
                joinedload(Meeting.reminders),
            )
            .where(Meeting.tenant_id == tenant_id)
        )

    def get_by_id(self, tenant_id: uuid.UUID, meeting_id: uuid.UUID) -> Meeting | None:
        return self.db.scalar(self.base_query(tenant_id).where(Meeting.id == meeting_id))

    def list_meetings(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        meeting_type: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        company_id: uuid.UUID | None = None,
        contact_id: uuid.UUID | None = None,
        lead_id: uuid.UUID | None = None,
        deal_id: uuid.UUID | None = None,
        organizer_id: uuid.UUID | None = None,
        participant_id: uuid.UUID | None = None,
        start_from: datetime | None = None,
        start_to: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Meeting], int]:
        query = self.base_query(tenant_id)
        filters = []
        if q:
            term = f"%{q.strip()}%"
            filters.append(
                or_(
                    Meeting.title.ilike(term),
                    Meeting.description.ilike(term),
                    Meeting.location.ilike(term),
                )
            )
        if meeting_type:
            filters.append(Meeting.meeting_type == meeting_type)
        if status:
            filters.append(Meeting.status == status)
        if priority:
            filters.append(Meeting.priority == priority)
        if company_id:
            filters.append(Meeting.company_id == company_id)
        if contact_id:
            filters.append(Meeting.contact_id == contact_id)
        if lead_id:
            filters.append(Meeting.lead_id == lead_id)
        if deal_id:
            filters.append(Meeting.deal_id == deal_id)
        if organizer_id:
            filters.append(Meeting.organizer_id == organizer_id)
        if participant_id:
            query = query.join(MeetingParticipant).where(MeetingParticipant.user_id == participant_id)
        if start_from:
            filters.append(Meeting.start_datetime >= start_from)
        if start_to:
            filters.append(Meeting.start_datetime <= start_to)
        if filters:
            query = query.where(and_(*filters))

        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = list(
            self.db.scalars(
                query.order_by(Meeting.start_datetime)
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).unique().all()
        )
        return items, int(total)

    def calendar_range(
        self,
        tenant_id: uuid.UUID,
        start: datetime,
        end: datetime,
        *,
        meeting_type: str | None = None,
        status: str | None = None,
        organizer_id: uuid.UUID | None = None,
    ) -> list[Meeting]:
        query = self.base_query(tenant_id).where(
            Meeting.start_datetime < end,
            Meeting.end_datetime > start,
        )
        if meeting_type:
            query = query.where(Meeting.meeting_type == meeting_type)
        if status:
            query = query.where(Meeting.status == status)
        if organizer_id:
            query = query.where(Meeting.organizer_id == organizer_id)
        return list(self.db.scalars(query.order_by(Meeting.start_datetime)).unique().all())

    def upcoming(
        self,
        tenant_id: uuid.UUID,
        *,
        limit: int = 10,
        user_id: uuid.UUID | None = None,
    ) -> list[Meeting]:
        now = datetime.now(UTC)
        query = self.base_query(tenant_id).where(
            Meeting.start_datetime >= now,
            Meeting.status.in_(OPEN_MEETING_STATUSES),
        )
        if user_id:
            query = query.outerjoin(MeetingParticipant).where(
                or_(Meeting.organizer_id == user_id, MeetingParticipant.user_id == user_id)
            )
        return list(
            self.db.scalars(query.order_by(Meeting.start_datetime).limit(limit)).unique().all()
        )

    def today(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None = None) -> list[Meeting]:
        now = datetime.now(UTC)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        return self.calendar_range(tenant_id, day_start, day_end)

    def statistics(self, tenant_id: uuid.UUID) -> dict:
        now = datetime.now(UTC)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        week_end = day_start + timedelta(days=7)
        month_start = day_start.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        base = Meeting.tenant_id == tenant_id
        meetings_today = self.db.scalar(
            select(func.count()).select_from(Meeting).where(
                base,
                Meeting.start_datetime >= day_start,
                Meeting.start_datetime < day_end,
                Meeting.status != "cancelled",
            )
        ) or 0
        meetings_this_week = self.db.scalar(
            select(func.count()).select_from(Meeting).where(
                base,
                Meeting.start_datetime >= day_start,
                Meeting.start_datetime < week_end,
                Meeting.status != "cancelled",
            )
        ) or 0
        meetings_this_month = self.db.scalar(
            select(func.count()).select_from(Meeting).where(
                base,
                Meeting.start_datetime >= month_start,
                Meeting.start_datetime < month_end,
                Meeting.status != "cancelled",
            )
        ) or 0
        completed = self.db.scalar(
            select(func.count()).select_from(Meeting).where(base, Meeting.status == "completed")
        ) or 0
        cancelled = self.db.scalar(
            select(func.count()).select_from(Meeting).where(base, Meeting.status == "cancelled")
        ) or 0
        upcoming = self.db.scalar(
            select(func.count()).select_from(Meeting).where(
                base,
                Meeting.start_datetime >= now,
                Meeting.status.in_(OPEN_MEETING_STATUSES),
            )
        ) or 0
        overdue = self.db.scalar(
            select(func.count()).select_from(Meeting).where(
                base,
                Meeting.end_datetime < now,
                Meeting.status.in_(OPEN_MEETING_STATUSES),
            )
        ) or 0
        upcoming_calls = self.db.scalar(
            select(func.count()).select_from(Meeting).where(
                base,
                Meeting.meeting_type == "call",
                Meeting.start_datetime >= now,
                Meeting.status.in_(OPEN_MEETING_STATUSES),
            )
        ) or 0
        upcoming_demos = self.db.scalar(
            select(func.count()).select_from(Meeting).where(
                base,
                Meeting.meeting_type == "demo",
                Meeting.start_datetime >= now,
                Meeting.status.in_(OPEN_MEETING_STATUSES),
            )
        ) or 0
        return {
            "meetings_today": meetings_today,
            "meetings_this_week": meetings_this_week,
            "meetings_this_month": meetings_this_month,
            "completed_meetings": completed,
            "cancelled_meetings": cancelled,
            "upcoming_meetings": upcoming,
            "overdue_meetings": overdue,
            "upcoming_calls": upcoming_calls,
            "upcoming_demos": upcoming_demos,
        }

    def get_reminder_candidates(self, tenant_id: uuid.UUID, within_minutes: int = 60) -> list[Meeting]:
        now = datetime.now(UTC)
        window_end = now + timedelta(minutes=within_minutes)
        return list(
            self.db.scalars(
                self.base_query(tenant_id)
                .join(MeetingReminder)
                .where(
                    Meeting.start_datetime >= now,
                    Meeting.start_datetime <= window_end,
                    Meeting.status.in_(OPEN_MEETING_STATUSES),
                )
            ).unique().all()
        )
