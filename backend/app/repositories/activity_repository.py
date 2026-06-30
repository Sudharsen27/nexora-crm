"""Entity name resolution for activity timeline (batch queries, no N+1)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Activity, Company, Contact, Deal, Lead, Task, Tenant, User


@dataclass(frozen=True)
class ActivityEntityRef:
    entity_type: str
    entity_id: uuid.UUID
    display_name: str
    href_path: str | None = None


class ActivityRepository:
    def __init__(self, db: Session):
        self.db = db

    def resolve_entities(
        self,
        tenant_id: uuid.UUID,
        tenant_slug: str,
        activities: list[Activity],
    ) -> dict[tuple[str, uuid.UUID], ActivityEntityRef]:
        if not activities:
            return {}

        by_type: dict[str, set[uuid.UUID]] = {}
        for activity in activities:
            by_type.setdefault(activity.entity_type, set()).add(activity.entity_id)

        refs: dict[tuple[str, uuid.UUID], ActivityEntityRef] = {}

        if "lead" in by_type:
            rows = self.db.scalars(
                select(Lead).where(Lead.tenant_id == tenant_id, Lead.id.in_(by_type["lead"]))
            ).all()
            for row in rows:
                name = f"{row.first_name} {row.last_name}".strip() or row.email or "Lead"
                refs[("lead", row.id)] = ActivityEntityRef(
                    "lead", row.id, name, f"/{tenant_slug}/leads/{row.id}"
                )

        if "contact" in by_type:
            rows = self.db.scalars(
                select(Contact).where(Contact.tenant_id == tenant_id, Contact.id.in_(by_type["contact"]))
            ).all()
            for row in rows:
                name = f"{row.first_name} {row.last_name}".strip() or row.email or "Contact"
                refs[("contact", row.id)] = ActivityEntityRef(
                    "contact", row.id, name, f"/{tenant_slug}/contacts/{row.id}"
                )

        if "deal" in by_type:
            rows = self.db.scalars(
                select(Deal).where(Deal.tenant_id == tenant_id, Deal.id.in_(by_type["deal"]))
            ).all()
            for row in rows:
                refs[("deal", row.id)] = ActivityEntityRef(
                    "deal", row.id, row.title, f"/{tenant_slug}/deals/{row.id}"
                )

        if "company" in by_type:
            rows = self.db.scalars(
                select(Company).where(Company.tenant_id == tenant_id, Company.id.in_(by_type["company"]))
            ).all()
            for row in rows:
                refs[("company", row.id)] = ActivityEntityRef(
                    "company", row.id, row.company_name, f"/{tenant_slug}/companies/{row.id}"
                )

        if "task" in by_type:
            rows = self.db.scalars(
                select(Task).where(Task.tenant_id == tenant_id, Task.id.in_(by_type["task"]))
            ).all()
            for row in rows:
                refs[("task", row.id)] = ActivityEntityRef(
                    "task", row.id, row.title, f"/{tenant_slug}/tasks/{row.id}"
                )

        if "user" in by_type:
            rows = self.db.scalars(select(User).where(User.id.in_(by_type["user"]))).all()
            for row in rows:
                refs[("user", row.id)] = ActivityEntityRef("user", row.id, row.full_name, None)

        if "tenant" in by_type:
            rows = self.db.scalars(
                select(Tenant).where(Tenant.id.in_(by_type["tenant"]))
            ).all()
            for row in rows:
                refs[("tenant", row.id)] = ActivityEntityRef(
                    "tenant", row.id, row.name, f"/{tenant_slug}/settings/team"
                )

        return refs
