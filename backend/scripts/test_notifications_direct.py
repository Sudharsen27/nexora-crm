"""Direct service-level notification smoke test (no HTTP)."""

from __future__ import annotations

import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, Tenant, TenantMembership, User
from app.repositories.notification_repository import NotificationRepository
from app.schemas.company import CompanyCreate
from app.schemas.deal import DealCreate, DealUpdate
from app.schemas.lead import LeadCreate, LeadUpdate
from app.schemas.task import TaskCreate
from app.services.auth_service import TenantService
from app.services.company_service import CompanyService
from app.services.deal_service import DealService
from app.services.lead_service import LeadService
from app.services.task_service import TaskService


def main() -> int:
    db = SessionLocal()
    ts = int(time.time())
    owner_email = f"owner-{ts}@example.com"
    member_email = f"member-{ts}@example.com"
    password = "TestPass123!"
    slug = f"notif-test-{uuid.uuid4().hex[:8]}"

    print("=== Direct Notification Smoke Test ===\n")

    owner = User(
        email=owner_email,
        password_hash=hash_password(password),
        full_name="Notification Owner",
        is_verified=True,
        is_active=True,
    )
    member = User(
        email=member_email,
        password_hash=hash_password(password),
        full_name="Notification Member",
        is_verified=True,
        is_active=True,
    )
    db.add_all([owner, member])
    db.flush()

    tenant_svc = TenantService(db)
    tenant = tenant_svc.create_tenant(owner, "Notification Test Org", slug)
    tenant_id = tenant.id

    member_role = db.scalar(
        select(Role).where(Role.tenant_id == tenant_id, Role.slug == "member")
    )
    owner_membership = db.scalar(
        select(TenantMembership).where(
            TenantMembership.tenant_id == tenant_id,
            TenantMembership.user_id == owner.id,
        )
    )
    tenant_svc.add_member(tenant_id, member_email, member_role.id, owner_membership)
    db.commit()

    lead_svc = LeadService(db)
    deal_svc = DealService(db)
    task_svc = TaskService(db)
    company_svc = CompanyService(db)

    lead = lead_svc.create_lead(
        tenant_id,
        LeadCreate(first_name="Notify", last_name="Lead", status="new"),
        owner.id,
    )
    lead_svc.update_lead(
        tenant_id,
        lead.id,
        LeadUpdate(assigned_to_id=member.id),
        owner.id,
    )

    deal = deal_svc.create_deal(
        tenant_id,
        DealCreate(
            title="Notification Test Deal",
            stage="new",
            value="5000",
            assigned_to_id=member.id,
        ),
        owner.id,
    )
    deal_svc.update_deal(tenant_id, deal.id, DealUpdate(stage="won"), owner.id)

    task_svc.create_task(
        tenant_id,
        TaskCreate(
            title="Notification test task",
            status="pending",
            priority="medium",
            assigned_to_id=member.id,
            entity_type="lead",
            entity_id=lead.id,
        ),
        owner.id,
    )

    company_svc.create_company(
        tenant_id,
        CompanyCreate(company_name="Notify Corp"),
        owner.id,
    )

    repo = NotificationRepository(db)
    items, total, _, _ = repo.list_notifications(tenant_id, member.id, page_size=50)
    unread = repo.unread_count(tenant_id, member.id)

    print(f"Tenant slug: {slug}")
    print(f"Owner: {owner_email} / {password}")
    print(f"Member: {member_email} / {password}")
    print(f"Total: {total}, Unread: {unread}, Items: {len(items)}\n")

    if not items:
        print("FAIL: No notifications for member.")
        return 1

    for i, n in enumerate(items, 1):
        print(f"  {i}. [{n.type}] {n.title}")

    types = {n.type for n in items}
    expected = {"lead_assigned", "deal_created", "deal_won", "task_assigned", "user_invited"}
    missing = expected - types
    if missing:
        print(f"\nWARN: Missing types: {missing}")
    else:
        print("\nPASS: All core notification types present.")

    affected = repo.mark_all_read(tenant_id, member.id)
    db.commit()
    unread_after = repo.unread_count(tenant_id, member.id)
    print(f"Mark all read: {affected}, unread after: {unread_after}")

    print(f"\nFrontend: http://localhost:3000/{slug}/notifications")
    return 0


if __name__ == "__main__":
    sys.exit(main())
