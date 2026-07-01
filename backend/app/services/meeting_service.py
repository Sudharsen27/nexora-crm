import math
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.mixins import utcnow
from app.models import Company, Contact, Deal, Lead, Task, TenantMembership
from app.models.meeting import Meeting, MeetingParticipant, MeetingReminder
from app.repositories.meeting_repository import MeetingRepository
from app.schemas.meeting import MeetingCreate, MeetingParticipantInput, MeetingReminderInput, MeetingReschedule, MeetingStatusUpdate, MeetingUpdate
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_user


def paginate(total: int, page: int, page_size: int) -> dict:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)) if total else 0,
    }


class MeetingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = MeetingRepository(db)

    def _validate_member(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
        if user_id is None:
            return
        exists = self.db.scalar(
            select(TenantMembership.id).where(
                TenantMembership.tenant_id == tenant_id,
                TenantMembership.user_id == user_id,
                TenantMembership.status == "active",
            )
        )
        if exists is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not an active member")

    def _validate_fk(self, tenant_id: uuid.UUID, payload: MeetingCreate | MeetingUpdate) -> None:
        checks = [
            (payload.company_id if hasattr(payload, "company_id") else None, Company, "Company"),
            (payload.contact_id if hasattr(payload, "contact_id") else None, Contact, "Contact"),
            (payload.lead_id if hasattr(payload, "lead_id") else None, Lead, "Lead"),
            (payload.deal_id if hasattr(payload, "deal_id") else None, Deal, "Deal"),
            (payload.task_id if hasattr(payload, "task_id") else None, Task, "Task"),
        ]
        for entity_id, model, label in checks:
            if entity_id is None:
                continue
            found = self.db.scalar(
                select(model.id).where(model.id == entity_id, model.tenant_id == tenant_id)
            )
            if found is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{label} not found")

    def _entity_link(self, meeting: Meeting) -> tuple[str | None, uuid.UUID | None]:
        if meeting.deal_id:
            return "deal", meeting.deal_id
        if meeting.contact_id:
            return "contact", meeting.contact_id
        if meeting.lead_id:
            return "lead", meeting.lead_id
        if meeting.company_id:
            return "company", meeting.company_id
        if meeting.task_id:
            return "task", meeting.task_id
        return None, None

    def _sync_participants(self, meeting: Meeting, participants: list) -> None:
        meeting.participants.clear()
        self.db.flush()
        for p in participants:
            self._validate_member(meeting.tenant_id, p.user_id)
            meeting.participants.append(
                MeetingParticipant(
                    user_id=p.user_id,
                    role=p.role,
                    attendance_status=p.attendance_status,
                    created_at=utcnow(),
                )
            )

    def _sync_reminders(self, meeting: Meeting, reminders: list) -> None:
        meeting.reminders.clear()
        self.db.flush()
        for r in reminders:
            meeting.reminders.append(
                MeetingReminder(
                    remind_before_minutes=r.remind_before_minutes,
                    method=r.method,
                    created_at=utcnow(),
                )
            )

    def _log_meeting(
        self,
        tenant_id: uuid.UUID,
        meeting: Meeting,
        action: str,
        title: str,
        description: str,
        actor_id: uuid.UUID | None,
    ) -> None:
        entity_type, entity_id = self._entity_link(meeting)
        if not entity_type:
            entity_type, entity_id = "tenant", meeting.tenant_id
        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            title=title,
            description=description,
            scheduled_at=meeting.start_datetime,
            metadata={"meeting_id": str(meeting.id), "meeting_type": meeting.meeting_type},
        )

    def _notify_participants(
        self,
        meeting: Meeting,
        *,
        actor_id: uuid.UUID | None,
        ntype: str,
        title: str,
        message: str,
        exclude_actor: bool = True,
    ) -> None:
        notify_entity_type = "meeting"
        notify_entity_id = meeting.id
        seen: set[uuid.UUID] = set()
        targets = [p.user_id for p in meeting.participants]
        if meeting.organizer_id:
            targets.append(meeting.organizer_id)
        for uid in targets:
            if uid in seen:
                continue
            seen.add(uid)
            if exclude_actor and actor_id and uid == actor_id:
                continue
            notify_user(
                self.db,
                tenant_id=meeting.tenant_id,
                user_id=uid,
                actor_id=actor_id,
                type=ntype,
                title=title,
                message=message,
                entity_type=notify_entity_type,
                entity_id=notify_entity_id,
            )

    def get_meeting(self, tenant_id: uuid.UUID, meeting_id: uuid.UUID) -> Meeting:
        meeting = self.repo.get_by_id(tenant_id, meeting_id)
        if meeting is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
        return meeting

    def list_meetings(self, tenant_id: uuid.UUID, **kwargs) -> tuple[list[Meeting], int]:
        return self.repo.list_meetings(tenant_id, **kwargs)

    def create_meeting(
        self,
        tenant_id: uuid.UUID,
        payload: MeetingCreate,
        created_by_id: uuid.UUID,
    ) -> Meeting:
        self._validate_fk(tenant_id, payload)
        organizer_id = payload.organizer_id or created_by_id
        self._validate_member(tenant_id, organizer_id)

        meeting = Meeting(
            tenant_id=tenant_id,
            title=payload.title,
            description=payload.description,
            agenda=payload.agenda,
            notes=payload.notes,
            meeting_type=payload.meeting_type,
            status=payload.status,
            priority=payload.priority,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
            timezone=payload.timezone,
            location=payload.location,
            meeting_url=payload.meeting_url,
            company_id=payload.company_id,
            contact_id=payload.contact_id,
            lead_id=payload.lead_id,
            deal_id=payload.deal_id,
            task_id=payload.task_id,
            organizer_id=organizer_id,
            created_by_id=created_by_id,
            updated_by_id=created_by_id,
            recurrence_rule=payload.recurrence_rule,
            meeting_metadata=payload.metadata,
        )
        self.db.add(meeting)
        self.db.flush()

        participants = list(payload.participants)
        if not any(p.user_id == organizer_id for p in participants):
            participants.append(
                MeetingParticipantInput(user_id=organizer_id, role="organizer", attendance_status="accepted")
            )
        self._sync_participants(meeting, participants)
        if payload.reminders:
            self._sync_reminders(meeting, payload.reminders)

        self._log_meeting(
            tenant_id,
            meeting,
            "meeting_scheduled",
            "Meeting scheduled",
            f'Meeting "{meeting.title}" was scheduled',
            created_by_id,
        )
        self._notify_participants(
            meeting,
            actor_id=created_by_id,
            ntype="meeting_scheduled",
            title="Meeting scheduled",
            message=f'"{meeting.title}" on {meeting.start_datetime.strftime("%b %d, %H:%M")}',
        )
        notify_user(
            self.db,
            tenant_id=tenant_id,
            user_id=created_by_id,
            actor_id=None,
            type="meeting_scheduled",
            title="Meeting scheduled",
            message=f'You scheduled "{meeting.title}" for {meeting.start_datetime.strftime("%b %d, %H:%M")}',
            entity_type="meeting",
            entity_id=meeting.id,
        )
        self.db.commit()
        return self.get_meeting(tenant_id, meeting.id)

    def update_meeting(
        self,
        tenant_id: uuid.UUID,
        meeting_id: uuid.UUID,
        payload: MeetingUpdate,
        updated_by_id: uuid.UUID,
    ) -> Meeting:
        meeting = self.get_meeting(tenant_id, meeting_id)
        data = payload.model_dump(exclude_unset=True)
        participants = data.pop("participants", None)
        reminders = data.pop("reminders", None)
        metadata = data.pop("metadata", None)

        if "organizer_id" in data:
            self._validate_member(tenant_id, data["organizer_id"])
        self._validate_fk(tenant_id, payload)

        for field, value in data.items():
            setattr(meeting, field, value)
        if metadata is not None:
            meeting.meeting_metadata = metadata
        meeting.updated_by_id = updated_by_id

        if participants is not None:
            old_ids = {p.user_id for p in meeting.participants}
            self._sync_participants(meeting, participants)
            self.db.flush()
            new_ids = {p.user_id for p in meeting.participants}
            for uid in new_ids - old_ids:
                if uid == updated_by_id:
                    continue
                notify_user(
                    self.db,
                    tenant_id=tenant_id,
                    user_id=uid,
                    actor_id=updated_by_id,
                    type="meeting_participant_added",
                    title="Added to meeting",
                    message=f'You were invited to "{meeting.title}"',
                    entity_type="meeting",
                    entity_id=meeting.id,
                )
        if reminders is not None:
            self._sync_reminders(meeting, reminders)

        self._log_meeting(
            tenant_id,
            meeting,
            "meeting_updated",
            "Meeting updated",
            f'Meeting "{meeting.title}" was updated',
            updated_by_id,
        )
        self.db.commit()
        return self.get_meeting(tenant_id, meeting_id)

    def reschedule_meeting(
        self,
        tenant_id: uuid.UUID,
        meeting_id: uuid.UUID,
        payload: MeetingReschedule,
        updated_by_id: uuid.UUID,
    ) -> Meeting:
        meeting = self.get_meeting(tenant_id, meeting_id)
        old_start = meeting.start_datetime
        meeting.start_datetime = payload.start_datetime
        meeting.end_datetime = payload.end_datetime
        if payload.timezone:
            meeting.timezone = payload.timezone
        meeting.updated_by_id = updated_by_id

        self._log_meeting(
            tenant_id,
            meeting,
            "meeting_rescheduled",
            "Meeting rescheduled",
            f'"{meeting.title}" moved to {meeting.start_datetime.strftime("%b %d, %H:%M")}',
            updated_by_id,
        )
        self._notify_participants(
            meeting,
            actor_id=updated_by_id,
            ntype="meeting_rescheduled",
            title="Meeting rescheduled",
            message=f'"{meeting.title}" moved from {old_start.strftime("%b %d, %H:%M")}',
        )
        self.db.commit()
        return self.get_meeting(tenant_id, meeting_id)

    def update_status(
        self,
        tenant_id: uuid.UUID,
        meeting_id: uuid.UUID,
        payload: MeetingStatusUpdate,
        updated_by_id: uuid.UUID,
    ) -> Meeting:
        meeting = self.get_meeting(tenant_id, meeting_id)
        old_status = meeting.status
        meeting.status = payload.status
        meeting.updated_by_id = updated_by_id

        action_map = {
            "cancelled": ("meeting_cancelled", "Meeting cancelled", "was cancelled"),
            "completed": ("meeting_completed", "Meeting completed", "was marked complete"),
            "in_progress": ("meeting_started", "Meeting started", "is now in progress"),
        }
        if payload.status in action_map:
            ntype, title, suffix = action_map[payload.status]
            self._log_meeting(
                tenant_id,
                meeting,
                ntype,
                title,
                f'"{meeting.title}" {suffix}',
                updated_by_id,
            )
            self._notify_participants(
                meeting,
                actor_id=updated_by_id,
                ntype=ntype,
                title=title,
                message=f'"{meeting.title}" {suffix}',
            )
        elif payload.status != old_status:
            self._log_meeting(
                tenant_id,
                meeting,
                "meeting_updated",
                "Meeting status changed",
                f'"{meeting.title}" status: {old_status} → {payload.status}',
                updated_by_id,
            )

        self.db.commit()
        return self.get_meeting(tenant_id, meeting_id)

    def duplicate_meeting(
        self,
        tenant_id: uuid.UUID,
        meeting_id: uuid.UUID,
        created_by_id: uuid.UUID,
    ) -> Meeting:
        source = self.get_meeting(tenant_id, meeting_id)
        from app.schemas.meeting import MeetingParticipantInput, MeetingReminderInput

        payload = MeetingCreate(
            title=f"{source.title} (copy)",
            description=source.description,
            agenda=source.agenda,
            meeting_type=source.meeting_type,
            status="scheduled",
            priority=source.priority,
            start_datetime=source.start_datetime,
            end_datetime=source.end_datetime,
            timezone=source.timezone,
            location=source.location,
            meeting_url=source.meeting_url,
            company_id=source.company_id,
            contact_id=source.contact_id,
            lead_id=source.lead_id,
            deal_id=source.deal_id,
            task_id=source.task_id,
            organizer_id=source.organizer_id,
            metadata=source.meeting_metadata,
            participants=[
                MeetingParticipantInput(user_id=p.user_id, role=p.role, attendance_status="invited")
                for p in source.participants
            ],
            reminders=[
                MeetingReminderInput(remind_before_minutes=r.remind_before_minutes, method=r.method)
                for r in source.reminders
            ],
        )
        return self.create_meeting(tenant_id, payload, created_by_id)

    def delete_meeting(
        self,
        tenant_id: uuid.UUID,
        meeting_id: uuid.UUID,
        deleted_by_id: uuid.UUID,
    ) -> None:
        meeting = self.get_meeting(tenant_id, meeting_id)
        self._log_meeting(
            tenant_id,
            meeting,
            "meeting_cancelled",
            "Meeting deleted",
            f'Meeting "{meeting.title}" was deleted',
            deleted_by_id,
        )
        self.db.delete(meeting)
        self.db.commit()

    def add_participant(
        self,
        tenant_id: uuid.UUID,
        meeting_id: uuid.UUID,
        user_id: uuid.UUID,
        role: str,
        actor_id: uuid.UUID,
    ) -> Meeting:
        meeting = self.get_meeting(tenant_id, meeting_id)
        self._validate_member(tenant_id, user_id)
        if any(p.user_id == user_id for p in meeting.participants):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a participant")
        meeting.participants.append(
            MeetingParticipant(user_id=user_id, role=role, attendance_status="invited", created_at=utcnow())
        )
        notify_user(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            actor_id=actor_id,
            type="meeting_participant_added",
            title="Added to meeting",
            message=f'You were added to "{meeting.title}"',
            entity_type="meeting",
            entity_id=meeting.id,
        )
        self.db.commit()
        return self.get_meeting(tenant_id, meeting_id)
