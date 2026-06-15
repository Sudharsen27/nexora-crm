from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import decode_token, parse_uuid
from app.db.session import get_db
from app.models import Permission, Role, Tenant, TenantMembership, User

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class TenantContext:
    tenant: Tenant
    membership: TenantMembership
    role: Role
    permissions: list[str]


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = parse_uuid(payload.get("sub", ""))
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_tenant_context(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TenantContext:
    tenant = db.scalar(select(Tenant).where(Tenant.slug == slug, Tenant.status == "active"))
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    membership = db.scalar(
        select(TenantMembership)
        .options(joinedload(TenantMembership.role).joinedload(Role.permissions))
        .where(
            TenantMembership.tenant_id == tenant.id,
            TenantMembership.user_id == current_user.id,
            TenantMembership.status == "active",
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this organization")

    permissions = [permission.slug for permission in membership.role.permissions]
    return TenantContext(
        tenant=tenant,
        membership=membership,
        role=membership.role,
        permissions=permissions,
    )


def require_permission(permission: str):
    def checker(ctx: TenantContext = Depends(get_tenant_context)) -> TenantContext:
        if permission not in ctx.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return ctx

    return checker
