"""Build CRM context snippets for LLM system prompts."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.deal import Deal
from app.models.lead import Lead
from app.models.meeting import Meeting
from app.models.task import Task


def build_crm_context(db: Session, tenant_id: uuid.UUID) -> str:
    """Return a compact text summary of tenant CRM data for the AI system prompt."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    lead_count = db.scalar(
        select(func.count()).select_from(Lead).where(Lead.tenant_id == tenant_id)
    ) or 0
    deal_count = db.scalar(
        select(func.count()).select_from(Deal).where(Deal.tenant_id == tenant_id)
    ) or 0
    open_deals = db.scalar(
        select(func.count())
        .select_from(Deal)
        .where(Deal.tenant_id == tenant_id, Deal.stage.notin_(["won", "lost"]))
    ) or 0
    pipeline_value = db.scalar(
        select(func.coalesce(func.sum(Deal.value), 0)).where(
            Deal.tenant_id == tenant_id,
            Deal.stage.notin_(["won", "lost"]),
        )
    ) or 0
    today = date.today()
    overdue_tasks = db.scalar(
        select(func.count())
        .select_from(Task)
        .where(
            Task.tenant_id == tenant_id,
            Task.status != "completed",
            Task.due_date.isnot(None),
            Task.due_date < today,
        )
    ) or 0
    meetings_today = db.scalar(
        select(func.count())
        .select_from(Meeting)
        .where(
            Meeting.tenant_id == tenant_id,
            Meeting.start_datetime >= today_start,
            Meeting.start_datetime < today_start.replace(hour=23, minute=59, second=59),
        )
    ) or 0

    top_deals = db.scalars(
        select(Deal)
        .where(Deal.tenant_id == tenant_id, Deal.stage.notin_(["won", "lost"]))
        .order_by(Deal.value.desc().nullslast())
        .limit(5)
    ).all()

    deal_lines = []
    for d in top_deals:
        value = f"${float(d.value):,.0f}" if d.value is not None else "N/A"
        deal_lines.append(f"- {d.title} ({d.stage}, {value})")

    deals_section = "\n".join(deal_lines) if deal_lines else "- No open deals"

    return f"""Current CRM snapshot for this organization:
- Leads: {lead_count}
- Total deals: {deal_count}
- Open deals: {open_deals}
- Pipeline value (open): ${float(pipeline_value):,.0f}
- Overdue tasks: {overdue_tasks}
- Meetings today: {meetings_today}

Top open deals by value:
{deals_section}
"""
