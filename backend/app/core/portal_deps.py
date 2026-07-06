"""Portal authentication and tenant context dependencies."""

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import decode_token, parse_uuid
from app.db.session import get_db
from app.models import Company, Contact, CustomerPortalUser, Tenant

portal_bearer = HTTPBearer(auto_error=False)


@dataclass
class PortalContext:
    tenant: Tenant
    portal_user: CustomerPortalUser
    contact: Contact
    company: Company | None


def get_current_portal_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(portal_bearer),
    db: Session = Depends(get_db),
) -> CustomerPortalUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if payload.get("type") != "portal_access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid portal token")

    user_id = parse_uuid(payload.get("sub", ""))
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    portal_user = db.scalar(
        select(CustomerPortalUser)
        .options(joinedload(CustomerPortalUser.contact), joinedload(CustomerPortalUser.company))
        .where(CustomerPortalUser.id == user_id)
    )
    if portal_user is None or not portal_user.is_active or portal_user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal account inactive")
    return portal_user


def get_portal_context(
    slug: str,
    portal_user: CustomerPortalUser = Depends(get_current_portal_user),
    db: Session = Depends(get_db),
) -> PortalContext:
    tenant = db.scalar(select(Tenant).where(Tenant.slug == slug, Tenant.status == "active"))
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    if portal_user.tenant_id != tenant.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Portal access denied for this organization")

    contact = portal_user.contact or db.get(Contact, portal_user.contact_id)
    if contact is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contact record not found")

    company = portal_user.company
    if company is None and portal_user.company_id:
        company = db.get(Company, portal_user.company_id)

    return PortalContext(
        tenant=tenant,
        portal_user=portal_user,
        contact=contact,
        company=company,
    )
