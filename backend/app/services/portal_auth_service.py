"""Customer portal authentication."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.security import (
    create_portal_access_token,
    create_refresh_token_value,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.mixins import utcnow
from app.models import Contact, CustomerPortalUser, PortalAuditLog, PortalSession, Tenant
from app.schemas.portal import PortalCreateUserRequest, PortalTokenResponse, PortalUserResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class PortalAuthService:
    def __init__(self, db: Session):
        self.db = db

    def _audit(self, tenant_id: uuid.UUID, portal_user_id: uuid.UUID | None, action: str, **kwargs) -> None:
        self.db.add(
            PortalAuditLog(
                tenant_id=tenant_id,
                portal_user_id=portal_user_id,
                action=action,
                resource_type=kwargs.get("resource_type"),
                resource_id=kwargs.get("resource_id"),
                detail=kwargs.get("detail"),
                ip_address=kwargs.get("ip_address"),
                created_at=utcnow(),
            )
        )

    def login(
        self,
        tenant_slug: str,
        email: str,
        password: str,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> PortalTokenResponse:
        tenant = self.db.scalar(select(Tenant).where(Tenant.slug == tenant_slug, Tenant.status == "active"))
        if tenant is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

        portal_user = self.db.scalar(
            select(CustomerPortalUser)
            .options(joinedload(CustomerPortalUser.contact), joinedload(CustomerPortalUser.company))
            .where(
                CustomerPortalUser.tenant_id == tenant.id,
                CustomerPortalUser.email == email.strip().lower(),
            )
        )
        if portal_user is None or not verify_password(password, portal_user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not portal_user.is_active or portal_user.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Portal account is inactive")

        portal_user.last_login_at = utcnow()
        access_token, refresh_token, expires_in = self._issue_tokens(
            portal_user, tenant, user_agent=user_agent, ip_address=ip_address
        )
        self._audit(tenant.id, portal_user.id, "login", ip_address=ip_address)
        self.db.commit()

        return PortalTokenResponse(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=refresh_token,
            tenant_slug=tenant.slug,
            tenant_name=tenant.name,
        )

    def _issue_tokens(
        self,
        portal_user: CustomerPortalUser,
        tenant: Tenant,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[str, str, int]:
        access_token = create_portal_access_token(
            str(portal_user.id),
            tenant_id=str(tenant.id),
            tenant_slug=tenant.slug,
            contact_id=str(portal_user.contact_id),
            company_id=str(portal_user.company_id) if portal_user.company_id else None,
        )
        refresh_value = create_refresh_token_value()
        expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.db.add(
            PortalSession(
                portal_user_id=portal_user.id,
                tenant_id=tenant.id,
                token_hash=hash_token(refresh_value),
                user_agent=user_agent,
                ip_address=ip_address,
                expires_at=expires_at,
                created_at=utcnow(),
            )
        )
        return access_token, refresh_value, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    def refresh(self, refresh_token: str) -> PortalTokenResponse:
        token_hash = hash_token(refresh_token)
        session = self.db.scalar(
            select(PortalSession)
            .options(joinedload(PortalSession.portal_user))
            .where(PortalSession.token_hash == token_hash, PortalSession.revoked_at.is_(None))
        )
        if session is None or session.expires_at < datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        portal_user = session.portal_user
        tenant = self.db.get(Tenant, session.tenant_id)
        if tenant is None or not portal_user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        session.revoked_at = utcnow()
        access_token, new_refresh, expires_in = self._issue_tokens(portal_user, tenant)
        self.db.commit()

        return PortalTokenResponse(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=new_refresh,
            tenant_slug=tenant.slug,
            tenant_name=tenant.name,
        )

    def to_user_response(self, portal_user: CustomerPortalUser, tenant: Tenant) -> PortalUserResponse:
        company_name = portal_user.company.name if portal_user.company else None
        if not company_name and portal_user.contact and portal_user.contact.company:
            company_name = portal_user.contact.company
        return PortalUserResponse(
            id=portal_user.id,
            email=portal_user.email,
            full_name=portal_user.full_name,
            job_title=portal_user.job_title,
            phone=portal_user.phone,
            contact_id=portal_user.contact_id,
            company_id=portal_user.company_id,
            company_name=company_name,
            tenant_slug=tenant.slug,
            tenant_name=tenant.name,
        )

    def create_portal_user(
        self,
        tenant_id: uuid.UUID,
        payload: PortalCreateUserRequest,
        *,
        invited_by_id: uuid.UUID | None = None,
    ) -> CustomerPortalUser:
        contact = self.db.get(Contact, payload.contact_id)
        if contact is None or contact.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

        existing = self.db.scalar(
            select(CustomerPortalUser).where(
                CustomerPortalUser.tenant_id == tenant_id,
                CustomerPortalUser.email == payload.email.lower(),
            )
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Portal email already exists")

        portal_user = CustomerPortalUser(
            tenant_id=tenant_id,
            contact_id=contact.id,
            company_id=contact.company_id,
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
            full_name=payload.full_name or f"{contact.first_name} {contact.last_name}".strip(),
            phone=contact.phone,
            job_title=contact.job_title,
            status="active",
            invited_by_id=invited_by_id,
        )
        self.db.add(portal_user)
        self.db.commit()
        self.db.refresh(portal_user)
        return portal_user
