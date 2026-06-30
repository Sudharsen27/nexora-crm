"""Centralized automatic activity logging for the enterprise timeline."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.activity import Activity

# Semantic actions recorded in the timeline.
ACTIVITY_ACTIONS = (
  # Companies
  "company_created",
  "company_updated",
  "company_deleted",
  # Contacts
  "contact_created",
  "contact_updated",
  "contact_deleted",
  # Leads
  "lead_created",
  "lead_updated",
  "lead_assigned",
  "lead_converted",
  "lead_deleted",
  # Deals
  "deal_created",
  "deal_updated",
  "deal_stage_changed",
  "deal_moved",
  "deal_won",
  "deal_lost",
  "deal_deleted",
  # Tasks
  "task_created",
  "task_updated",
  "task_completed",
  "task_reopened",
  "task_deleted",
  # Notes
  "note_added",
  "note_edited",
  # Auth / users
  "user_login",
  "user_invited",
  "password_reset",
  # Manual interactions (legacy activity_type values)
  "call",
  "meeting",
  "email",
  "note",
  "task_update",
  "lead_update",
  "deal_update",
)

ACTION_META: dict[str, dict[str, str]] = {
  "company_created": {"icon": "building", "color": "blue", "label": "Company created"},
  "company_updated": {"icon": "building", "color": "blue", "label": "Company updated"},
  "company_deleted": {"icon": "building", "color": "red", "label": "Company deleted"},
  "contact_created": {"icon": "user", "color": "cyan", "label": "Contact created"},
  "contact_updated": {"icon": "user", "color": "cyan", "label": "Contact updated"},
  "contact_deleted": {"icon": "user", "color": "red", "label": "Contact deleted"},
  "lead_created": {"icon": "user-plus", "color": "violet", "label": "Lead created"},
  "lead_updated": {"icon": "user-plus", "color": "violet", "label": "Lead updated"},
  "lead_assigned": {"icon": "user-check", "color": "violet", "label": "Lead assigned"},
  "lead_converted": {"icon": "arrow-right", "color": "green", "label": "Lead converted"},
  "lead_deleted": {"icon": "user-plus", "color": "red", "label": "Lead deleted"},
  "deal_created": {"icon": "briefcase", "color": "blue", "label": "Deal created"},
  "deal_updated": {"icon": "briefcase", "color": "blue", "label": "Deal updated"},
  "deal_stage_changed": {"icon": "git-branch", "color": "amber", "label": "Deal stage changed"},
  "deal_moved": {"icon": "git-branch", "color": "amber", "label": "Deal moved"},
  "deal_won": {"icon": "trophy", "color": "green", "label": "Deal won"},
  "deal_lost": {"icon": "x-circle", "color": "red", "label": "Deal lost"},
  "deal_deleted": {"icon": "briefcase", "color": "red", "label": "Deal deleted"},
  "task_created": {"icon": "check-square", "color": "indigo", "label": "Task created"},
  "task_updated": {"icon": "check-square", "color": "indigo", "label": "Task updated"},
  "task_completed": {"icon": "check-circle", "color": "green", "label": "Task completed"},
  "task_reopened": {"icon": "rotate-ccw", "color": "amber", "label": "Task reopened"},
  "task_deleted": {"icon": "check-square", "color": "red", "label": "Task deleted"},
  "note_added": {"icon": "file-text", "color": "slate", "label": "Note added"},
  "note_edited": {"icon": "file-text", "color": "slate", "label": "Note edited"},
  "user_login": {"icon": "log-in", "color": "zinc", "label": "User login"},
  "user_invited": {"icon": "user-plus", "color": "violet", "label": "User invited"},
  "password_reset": {"icon": "key", "color": "orange", "label": "Password reset"},
  "call": {"icon": "phone", "color": "blue", "label": "Call"},
  "meeting": {"icon": "calendar", "color": "purple", "label": "Meeting"},
  "email": {"icon": "mail", "color": "cyan", "label": "Email"},
  "note": {"icon": "file-text", "color": "slate", "label": "Note"},
}


class ActivityLogger:
    """Write timeline entries without committing — caller owns the transaction."""

    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        *,
        tenant_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        entity_type: str,
        entity_id: uuid.UUID,
        action: str,
        title: str,
        description: str,
        metadata: dict[str, Any] | None = None,
        icon: str | None = None,
        color: str | None = None,
        activity_type: str | None = None,
        scheduled_at=None,
    ) -> Activity:
        meta = ACTION_META.get(action, {})
        resolved_icon = icon or meta.get("icon", "activity")
        resolved_color = color or meta.get("color", "zinc")
        resolved_type = activity_type or action

        activity = Activity(
            tenant_id=tenant_id,
            entity_type=entity_type,
            entity_id=entity_id,
            activity_type=resolved_type,
            action=action,
            title=title,
            description=description,
            icon=resolved_icon,
            color=resolved_color,
            activity_metadata=metadata,
            created_by_id=actor_id,
            scheduled_at=scheduled_at,
        )
        self.db.add(activity)
        return activity
