"""Automatic notification emission for CRM events."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.core.notification_ws import notification_manager
from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationResponse

TYPE_META: dict[str, dict[str, str]] = {
    "lead_assigned": {"priority": "high", "icon": "user-check"},
    "lead_converted": {"priority": "normal", "icon": "arrow-right"},
    "deal_created": {"priority": "normal", "icon": "briefcase"},
    "deal_won": {"priority": "high", "icon": "trophy"},
    "deal_lost": {"priority": "normal", "icon": "x-circle"},
    "deal_stage_changed": {"priority": "normal", "icon": "git-branch"},
    "task_assigned": {"priority": "high", "icon": "check-square"},
    "task_completed": {"priority": "low", "icon": "check-circle"},
    "task_due_tomorrow": {"priority": "urgent", "icon": "clock"},
    "meeting_scheduled": {"priority": "normal", "icon": "calendar"},
    "meeting_reminder": {"priority": "high", "icon": "calendar"},
    "company_created": {"priority": "low", "icon": "building"},
    "contact_added": {"priority": "low", "icon": "user"},
    "note_added": {"priority": "low", "icon": "file-text"},
    "comment_mention": {"priority": "high", "icon": "at-sign"},
    "user_invited": {"priority": "normal", "icon": "user-plus"},
    "password_changed": {"priority": "high", "icon": "key"},
    "password_reset": {"priority": "high", "icon": "key"},
    "login_new_device": {"priority": "high", "icon": "shield"},
    "system_announcement": {"priority": "normal", "icon": "megaphone"},
}


class NotificationEmitter:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)

    def notify(
        self,
        *,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        type: str,
        title: str,
        message: str,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        priority: str | None = None,
        action_url: str | None = None,
        metadata: dict[str, Any] | None = None,
        dedup_key: str | None = None,
        tenant_slug: str | None = None,
    ) -> Notification | None:
        if actor_id == user_id and type not in (
            "password_changed",
            "password_reset",
            "login_new_device",
            "task_due_tomorrow",
            "meeting_reminder",
        ):
            return None
        if dedup_key and self.repo.exists_dedup(tenant_id, user_id, dedup_key):
            return None

        meta = TYPE_META.get(type, {})
        notification = Notification(
            tenant_id=tenant_id,
            user_id=user_id,
            actor_id=actor_id,
            type=type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            priority=priority or meta.get("priority", "normal"),
            action_url=action_url,
            notification_metadata=metadata,
            dedup_key=dedup_key,
        )
        self.repo.create(notification)
        self.db.flush()
        if notification.actor is None and actor_id:
            self.db.refresh(notification, attribute_names=["actor"])

        payload = _to_ws_payload(notification)
        notification_manager.schedule_send(tenant_id, user_id, {"event": "notification", "data": payload})
        return notification

    def notify_many(
        self,
        *,
        tenant_id: uuid.UUID,
        user_ids: list[uuid.UUID],
        actor_id: uuid.UUID | None,
        type: str,
        title: str,
        message: str,
        **kwargs: Any,
    ) -> list[Notification]:
        created: list[Notification] = []
        seen: set[uuid.UUID] = set()
        for uid in user_ids:
            if uid in seen:
                continue
            seen.add(uid)
            n = self.notify(
                tenant_id=tenant_id,
                user_id=uid,
                actor_id=actor_id,
                type=type,
                title=title,
                message=message,
                **kwargs,
            )
            if n:
                created.append(n)
        return created

    def build_action_url(self, tenant_slug: str, entity_type: str | None, entity_id: uuid.UUID | None) -> str | None:
        if not entity_type or not entity_id:
            return None
        paths = {
            "lead": f"/{tenant_slug}/leads/{entity_id}",
            "contact": f"/{tenant_slug}/contacts/{entity_id}",
            "deal": f"/{tenant_slug}/deals/{entity_id}",
            "company": f"/{tenant_slug}/companies/{entity_id}",
            "task": f"/{tenant_slug}/tasks/{entity_id}",
        }
        return paths.get(entity_type)

    def scan_reminders(self, tenant_id: uuid.UUID, tenant_slug: str) -> None:
        tomorrow = __import__("datetime").date.today() + __import__("datetime").timedelta(days=1)
        for task in self.repo.get_due_tasks_tomorrow(tenant_id):
            if not task.assigned_to_id:
                continue
            self.notify(
                tenant_id=tenant_id,
                user_id=task.assigned_to_id,
                actor_id=None,
                type="task_due_tomorrow",
                title="Task due tomorrow",
                message=f'"{task.title}" is due tomorrow',
                entity_type="task",
                entity_id=task.id,
                action_url=self.build_action_url(tenant_slug, "task", task.id),
                dedup_key=f"task_due:{task.id}:{tomorrow.isoformat()}",
                tenant_slug=tenant_slug,
            )
        now = __import__("datetime").datetime.now(__import__("datetime").UTC)
        for meeting in self.repo.get_upcoming_meetings(tenant_id, within_hours=1):
            user_id = meeting.created_by_id
            if not user_id:
                continue
            sched = meeting.scheduled_at.isoformat() if meeting.scheduled_at else "soon"
            self.notify(
                tenant_id=tenant_id,
                user_id=user_id,
                actor_id=None,
                type="meeting_reminder",
                title="Meeting reminder",
                message=meeting.description or meeting.title,
                entity_type=meeting.entity_type,
                entity_id=meeting.entity_id,
                action_url=f"/{tenant_slug}/activities",
                dedup_key=f"meeting_reminder:{meeting.id}:{sched[:13]}",
                tenant_slug=tenant_slug,
            )


def _to_ws_payload(notification: Notification) -> dict:
    actor = None
    if notification.actor:
        actor = {
            "id": str(notification.actor.id),
            "full_name": notification.actor.full_name,
            "email": notification.actor.email,
        }
    return {
        "id": str(notification.id),
        "tenant_id": str(notification.tenant_id),
        "user_id": str(notification.user_id),
        "actor_id": str(notification.actor_id) if notification.actor_id else None,
        "actor": actor,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "entity_type": notification.entity_type,
        "entity_id": str(notification.entity_id) if notification.entity_id else None,
        "priority": notification.priority,
        "read": notification.read,
        "read_at": notification.read_at.isoformat() if notification.read_at else None,
        "action_url": notification.action_url,
        "metadata": notification.notification_metadata,
        "archived_at": notification.archived_at.isoformat() if notification.archived_at else None,
        "created_at": notification.created_at.isoformat(),
    }
