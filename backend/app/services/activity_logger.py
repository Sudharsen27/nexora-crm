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
  # Meetings
  "meeting_scheduled",
  "meeting_updated",
  "meeting_rescheduled",
  "meeting_cancelled",
  "meeting_completed",
  "meeting_started",
  # Emails
  "email_sent",
  "email_opened",
  "email_replied",
  # Workflows
  "workflow_started",
  "workflow_completed",
  "workflow_failed",
  "workflow_updated",
  # Documents
  "document_uploaded",
  "document_shared",
  "document_deleted",
  "signature_requested",
  "signature_completed",
  # Business Intelligence
  "dashboard_created",
  "dashboard_updated",
  "report_created",
  "report_generated",
  "report_exported",
  "report_scheduled",
  "forecast_generated",
  # Integrations
  "integration_installed",
  "integration_connected",
  "integration_disconnected",
  "integration_reconnected",
  "integration_synced",
  "webhook_created",
  "api_key_created",
  "api_key_revoked",
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
  "meeting_scheduled": {"icon": "calendar", "color": "purple", "label": "Meeting scheduled"},
  "meeting_updated": {"icon": "calendar", "color": "purple", "label": "Meeting updated"},
  "meeting_rescheduled": {"icon": "calendar", "color": "amber", "label": "Meeting rescheduled"},
  "meeting_cancelled": {"icon": "calendar-x", "color": "red", "label": "Meeting cancelled"},
  "meeting_completed": {"icon": "calendar-check", "color": "green", "label": "Meeting completed"},
  "meeting_started": {"icon": "calendar-clock", "color": "blue", "label": "Meeting started"},
  "email_sent": {"icon": "mail", "color": "cyan", "label": "Email sent"},
  "email_opened": {"icon": "mail-open", "color": "cyan", "label": "Email opened"},
  "email_replied": {"icon": "reply", "color": "cyan", "label": "Email replied"},
  "email": {"icon": "mail", "color": "cyan", "label": "Email"},
  "note": {"icon": "file-text", "color": "slate", "label": "Note"},
  "workflow_started": {"icon": "workflow", "color": "violet", "label": "Workflow started"},
  "workflow_completed": {"icon": "workflow", "color": "green", "label": "Workflow completed"},
  "workflow_failed": {"icon": "workflow", "color": "red", "label": "Workflow failed"},
  "workflow_updated": {"icon": "workflow", "color": "blue", "label": "Workflow updated"},
  "document_uploaded": {"icon": "file-up", "color": "blue", "label": "Document uploaded"},
  "document_shared": {"icon": "share-2", "color": "cyan", "label": "Document shared"},
  "document_deleted": {"icon": "trash-2", "color": "red", "label": "Document deleted"},
  "signature_requested": {"icon": "pen-line", "color": "amber", "label": "Signature requested"},
  "signature_completed": {"icon": "badge-check", "color": "green", "label": "Signature completed"},
  "dashboard_created": {"icon": "layout-dashboard", "color": "indigo", "label": "Dashboard created"},
  "dashboard_updated": {"icon": "layout-dashboard", "color": "indigo", "label": "Dashboard updated"},
  "report_created": {"icon": "bar-chart-2", "color": "violet", "label": "Report created"},
  "report_generated": {"icon": "bar-chart-2", "color": "violet", "label": "Report generated"},
  "report_exported": {"icon": "download", "color": "blue", "label": "Report exported"},
  "report_scheduled": {"icon": "calendar-clock", "color": "amber", "label": "Report scheduled"},
  "forecast_generated": {"icon": "trending-up", "color": "emerald", "label": "Forecast generated"},
  "integration_installed": {"icon": "plug", "color": "violet", "label": "Integration installed"},
  "integration_connected": {"icon": "plug", "color": "green", "label": "Integration connected"},
  "integration_disconnected": {"icon": "unplug", "color": "amber", "label": "Integration disconnected"},
  "integration_reconnected": {"icon": "refresh-cw", "color": "blue", "label": "Integration reconnected"},
  "integration_synced": {"icon": "refresh-cw", "color": "cyan", "label": "Integration synced"},
  "webhook_created": {"icon": "webhook", "color": "indigo", "label": "Webhook created"},
  "api_key_created": {"icon": "key", "color": "violet", "label": "API key created"},
  "api_key_revoked": {"icon": "key", "color": "red", "label": "API key revoked"},
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
