import logging
import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_password,
    hash_token,
)
from app.db.mixins import utcnow
from app.db.seed import ROLE_PERMISSIONS, SYSTEM_ROLES
from app.models import (
    PasswordResetToken,
    Permission,
    RefreshToken,
    Role,
    RolePermission,
    Tenant,
    TenantMembership,
    User,
)

from app.services.email_service import send_password_reset_email

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class PasswordResetResult:
    dev_reset_url: str | None = None
    email_sent: bool = False


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, email: str, password: str, full_name: str) -> User:
        existing = self.db.scalar(select(User).where(User.email == email.lower()))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            full_name=full_name.strip(),
            is_verified=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> User:
        from app.core.security import verify_password

        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if user is None or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
        return user

    def issue_tokens(
        self,
        user: User,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
        tenant_slug: str | None = None,
        permissions: list[str] | None = None,
        role: str | None = None,
        tenant_id: uuid.UUID | None = None,
    ) -> tuple[str, str, int]:
        extra_claims: dict = {}
        if tenant_id:
            extra_claims["tenant_id"] = str(tenant_id)
        if tenant_slug:
            extra_claims["tenant_slug"] = tenant_slug
        if role:
            extra_claims["role"] = role
        if permissions is not None:
            extra_claims["permissions"] = permissions

        access_token = create_access_token(str(user.id), extra_claims=extra_claims)
        refresh_value = create_refresh_token_value()
        refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_value),
            expires_at=utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            user_agent=user_agent,
            ip_address=ip_address,
            created_at=utcnow(),
        )
        self.db.add(refresh_token)
        self.db.commit()
        return access_token, refresh_value, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    def refresh_access_token(self, refresh_value: str) -> tuple[str, str, int, User]:
        token_hash = hash_token(refresh_value)
        stored = self.db.scalar(
            select(RefreshToken)
            .options(joinedload(RefreshToken.user))
            .where(RefreshToken.token_hash == token_hash)
        )
        if stored is None or stored.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        if stored.expires_at < utcnow():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

        stored.revoked_at = utcnow()
        return (*self.issue_tokens(stored.user), stored.user)

    def revoke_refresh_token(self, refresh_value: str) -> None:
        token_hash = hash_token(refresh_value)
        stored = self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        if stored and stored.revoked_at is None:
            stored.revoked_at = utcnow()
            self.db.commit()

    def request_password_reset(self, email: str) -> PasswordResetResult:
        """Create a reset token. Sends email when SMTP is configured."""
        settings = get_settings()
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if user is None or not user.is_active:
            return PasswordResetResult()

        now = utcnow()
        existing = self.db.scalars(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            )
        ).all()
        for row in existing:
            row.used_at = now

        raw_token = create_refresh_token_value()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
            created_at=now,
        )
        self.db.add(reset_token)
        self.db.commit()

        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
        email_sent = False
        if settings.email_enabled:
            try:
                send_password_reset_email(to=user.email, full_name=user.full_name, reset_url=reset_url)
                email_sent = True
            except Exception:
                logger.exception("Failed to send password reset email to %s", user.email)

        dev_reset_url = reset_url if settings.DEBUG and not email_sent else None
        return PasswordResetResult(dev_reset_url=dev_reset_url, email_sent=email_sent)

    def reset_password(self, raw_token: str, new_password: str) -> None:
        token_hash = hash_token(raw_token)
        stored = self.db.scalar(
            select(PasswordResetToken)
            .options(joinedload(PasswordResetToken.user))
            .where(PasswordResetToken.token_hash == token_hash)
        )
        if stored is None or stored.used_at is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
        if stored.expires_at < utcnow():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
        if not stored.user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

        stored.user.password_hash = hash_password(new_password)
        stored.used_at = utcnow()

        refresh_rows = self.db.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == stored.user_id,
                RefreshToken.revoked_at.is_(None),
            )
        ).all()
        for row in refresh_rows:
            row.revoked_at = utcnow()

        self.db.commit()


class TenantService:
    def __init__(self, db: Session):
        self.db = db

    def _slugify(self, name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        return slug or "org"

    def create_tenant(self, user: User, name: str, slug: str | None = None) -> Tenant:
        candidate = slug or self._slugify(name)
        base = candidate
        counter = 1
        while self.db.scalar(select(Tenant).where(Tenant.slug == candidate)):
            candidate = f"{base}-{counter}"
            counter += 1

        tenant = Tenant(name=name.strip(), slug=candidate, status="active")
        self.db.add(tenant)
        self.db.flush()

        roles = self._create_default_roles(tenant.id)
        owner_role = next(role for role in roles if role.slug == "owner")
        membership = TenantMembership(
            tenant_id=tenant.id,
            user_id=user.id,
            role_id=owner_role.id,
            status="active",
            joined_at=utcnow(),
            created_at=utcnow(),
        )
        self.db.add(membership)
        self.db.commit()
        self.db.refresh(tenant)
        return tenant

    def _create_default_roles(self, tenant_id: uuid.UUID) -> list[Role]:
        permissions = {
            permission.slug: permission
            for permission in self.db.scalars(select(Permission)).all()
        }
        roles: list[Role] = []
        for name, slug in SYSTEM_ROLES:
            role = Role(
                tenant_id=tenant_id,
                name=name,
                slug=slug,
                is_system=True,
                created_at=utcnow(),
            )
            self.db.add(role)
            self.db.flush()
            for perm_slug in ROLE_PERMISSIONS[slug]:
                self.db.add(
                    RolePermission(role_id=role.id, permission_id=permissions[perm_slug].id)
                )
            roles.append(role)
        return roles

    def list_user_tenants(self, user: User) -> list[tuple[Tenant, str]]:
        rows = self.db.execute(
            select(Tenant, Role.slug)
            .join(TenantMembership, TenantMembership.tenant_id == Tenant.id)
            .join(Role, Role.id == TenantMembership.role_id)
            .where(TenantMembership.user_id == user.id, TenantMembership.status == "active")
            .order_by(Tenant.name)
        ).all()
        return [(tenant, role_slug) for tenant, role_slug in rows]

    def get_members(self, tenant_id: uuid.UUID) -> list[dict]:
        rows = self.db.execute(
            select(TenantMembership, User, Role)
            .join(User, User.id == TenantMembership.user_id)
            .join(Role, Role.id == TenantMembership.role_id)
            .where(TenantMembership.tenant_id == tenant_id)
            .order_by(User.full_name)
        ).all()
        return [
            {
                "id": membership.id,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role_id": role.id,
                "role_slug": role.slug,
                "role_name": role.name,
                "status": membership.status,
            }
            for membership, user, role in rows
        ]

    def update_member(
        self,
        tenant_id: uuid.UUID,
        membership_id: uuid.UUID,
        *,
        role_id: uuid.UUID | None = None,
        status_value: str | None = None,
        actor_membership: TenantMembership,
    ) -> dict:
        membership = self.db.scalar(
            select(TenantMembership)
            .options(joinedload(TenantMembership.role), joinedload(TenantMembership.user))
            .where(TenantMembership.id == membership_id, TenantMembership.tenant_id == tenant_id)
        )
        if membership is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

        if membership.role.slug == "owner" and actor_membership.role.slug != "owner":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify owner")

        if membership.user_id == actor_membership.user_id and status_value == "suspended":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot suspend yourself")

        if role_id is not None:
            role = self.db.scalar(
                select(Role).where(Role.id == role_id, Role.tenant_id == tenant_id)
            )
            if role is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
            if role.slug == "owner" and actor_membership.role.slug != "owner":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot assign owner role")
            membership.role_id = role.id

        if status_value is not None:
            if status_value not in {"active", "suspended"}:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
            membership.status = status_value

        self.db.commit()
        self.db.refresh(membership)
        role = membership.role
        user = membership.user
        return {
            "id": membership.id,
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role_id": role.id,
            "role_slug": role.slug,
            "role_name": role.name,
            "status": membership.status,
        }

    def remove_member(
        self,
        tenant_id: uuid.UUID,
        membership_id: uuid.UUID,
        actor_membership: TenantMembership,
    ) -> None:
        membership = self.db.scalar(
            select(TenantMembership)
            .options(joinedload(TenantMembership.role))
            .where(TenantMembership.id == membership_id, TenantMembership.tenant_id == tenant_id)
        )
        if membership is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        if membership.role.slug == "owner":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot remove owner")
        if membership.user_id == actor_membership.user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove yourself")

        self.db.delete(membership)
        self.db.commit()

    def list_roles(self, tenant_id: uuid.UUID) -> list[Role]:
        return list(
            self.db.scalars(select(Role).where(Role.tenant_id == tenant_id).order_by(Role.name)).all()
        )

    def add_member(
        self,
        tenant_id: uuid.UUID,
        email: str,
        role_id: uuid.UUID,
        actor_membership: TenantMembership,
    ) -> dict:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found. They must register first.",
            )

        existing = self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == tenant_id,
                TenantMembership.user_id == user.id,
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member")

        role = self.db.scalar(select(Role).where(Role.id == role_id, Role.tenant_id == tenant_id))
        if role is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        if role.slug == "owner" and actor_membership.role.slug != "owner":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot assign owner role")

        membership = TenantMembership(
            tenant_id=tenant_id,
            user_id=user.id,
            role_id=role.id,
            status="active",
            joined_at=utcnow(),
            created_at=utcnow(),
        )
        self.db.add(membership)
        self.db.commit()
        self.db.refresh(membership)
        return {
            "id": membership.id,
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role_id": role.id,
            "role_slug": role.slug,
            "role_name": role.name,
            "status": membership.status,
        }


def seed_permissions(db: Session) -> None:
    from app.db.seed import PERMISSIONS, ROLE_PERMISSIONS
    from app.models import Role, RolePermission

    existing = {permission.slug: permission for permission in db.scalars(select(Permission)).all()}
    for resource, action, slug in PERMISSIONS:
        if slug not in existing:
            permission = Permission(resource=resource, action=action, slug=slug)
            db.add(permission)
            db.flush()
            existing[slug] = permission
    db.commit()

    roles = db.scalars(select(Role).where(Role.tenant_id.isnot(None))).all()
    for role in roles:
        expected_slugs = set(ROLE_PERMISSIONS.get(role.slug, []))
        current_slugs = {p.slug for p in role.permissions}
        missing = expected_slugs - current_slugs
        for slug in missing:
            if slug in existing:
                db.add(RolePermission(role_id=role.id, permission_id=existing[slug].id))
    db.commit()
