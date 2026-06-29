"""Create demo owner/admin/member accounts for local RBAC testing.

Run from repo root:
  cd backend && python -m scripts.seed_demo_users

Credentials (all use the same password):
  owner@example.com   / Password123!  (Owner)
  admin@example.com   / Password123!  (Admin)
  member@example.com  / Password123!  (Member)

Tenant slug: demo
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.mixins import utcnow
from app.db.session import SessionLocal
from app.models import Role, Tenant, TenantMembership, User
from app.services.auth_service import TenantService, seed_permissions

PASSWORD = "Password123!"
TENANT_SLUG = "demo"
TENANT_NAME = "Demo Company"

USERS = [
    ("owner@example.com", "Demo Owner", "owner"),
    ("admin@example.com", "Demo Admin", "admin"),
    ("member@example.com", "Demo Member", "member"),
]


def get_or_create_user(db, email: str, full_name: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        user = User(
            email=email.lower(),
            password_hash=hash_password(PASSWORD),
            full_name=full_name,
            is_verified=True,
            is_active=True,
        )
        db.add(user)
        db.flush()
        print(f"  created user {email}")
    else:
        user.password_hash = hash_password(PASSWORD)
        user.full_name = full_name
        user.is_active = True
        user.is_verified = True
        print(f"  updated password for {email}")
    return user


def main() -> None:
    db = SessionLocal()
    try:
        seed_permissions(db)

        print("Seeding demo users...")
        users_by_role: dict[str, User] = {}
        for email, full_name, role_slug in USERS:
            users_by_role[role_slug] = get_or_create_user(db, email, full_name)
        db.commit()

        tenant = db.scalar(select(Tenant).where(Tenant.slug == TENANT_SLUG))
        tenant_service = TenantService(db)

        if tenant is None:
            print(f"Creating tenant '{TENANT_SLUG}'...")
            tenant = tenant_service.create_tenant(users_by_role["owner"], TENANT_NAME, TENANT_SLUG)
            print(f"  tenant created: /{tenant.slug}")
        else:
            print(f"Tenant '{TENANT_SLUG}' already exists")

        owner_membership = db.scalar(
            select(TenantMembership)
            .join(Role, Role.id == TenantMembership.role_id)
            .where(
                TenantMembership.tenant_id == tenant.id,
                TenantMembership.user_id == users_by_role["owner"].id,
            )
        )
        if owner_membership is None:
            owner_role = db.scalar(
                select(Role).where(Role.tenant_id == tenant.id, Role.slug == "owner")
            )
            db.add(
                TenantMembership(
                    tenant_id=tenant.id,
                    user_id=users_by_role["owner"].id,
                    role_id=owner_role.id,
                    status="active",
                    joined_at=utcnow(),
                    created_at=utcnow(),
                )
            )
            db.commit()
            owner_membership = db.scalar(
                select(TenantMembership).where(
                    TenantMembership.tenant_id == tenant.id,
                    TenantMembership.user_id == users_by_role["owner"].id,
                )
            )

        for role_slug in ("admin", "member"):
            user = users_by_role[role_slug]
            existing = db.scalar(
                select(TenantMembership).where(
                    TenantMembership.tenant_id == tenant.id,
                    TenantMembership.user_id == user.id,
                )
            )
            if existing:
                role = db.scalar(
                    select(Role).where(Role.tenant_id == tenant.id, Role.slug == role_slug)
                )
                existing.role_id = role.id
                existing.status = "active"
                print(f"  membership updated: {user.email} -> {role_slug}")
            else:
                role = db.scalar(
                    select(Role).where(Role.tenant_id == tenant.id, Role.slug == role_slug)
                )
                tenant_service.add_member(tenant.id, user.email, role.id, owner_membership)
                print(f"  membership added: {user.email} -> {role_slug}")

        db.commit()

        print("\nDemo accounts ready:\n")
        print(f"  URL:      http://localhost:3000/{TENANT_SLUG}")
        print(f"  Password: {PASSWORD} (all accounts)\n")
        for email, full_name, role_slug in USERS:
            print(f"  {role_slug:6}  {email}  ({full_name})")
        print()
    finally:
        db.close()


if __name__ == "__main__":
    main()
