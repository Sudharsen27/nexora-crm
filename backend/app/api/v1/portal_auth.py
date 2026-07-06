"""Customer portal authentication routes."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.portal_deps import PortalContext, get_current_portal_user, get_portal_context
from app.db.session import get_db
from app.models import CustomerPortalUser, Tenant
from app.schemas.portal import PortalLoginRequest, PortalRefreshRequest, PortalTokenResponse, PortalUserResponse
from app.services.portal_auth_service import PortalAuthService

router = APIRouter(prefix="/portal/auth", tags=["portal-auth"])


@router.post("/login", response_model=PortalTokenResponse)
def portal_login(
    payload: PortalLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PortalTokenResponse:
    service = PortalAuthService(db)
    return service.login(
        payload.tenant_slug,
        payload.email,
        payload.password,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


@router.post("/refresh", response_model=PortalTokenResponse)
def portal_refresh(
    payload: PortalRefreshRequest,
    db: Session = Depends(get_db),
) -> PortalTokenResponse:
    service = PortalAuthService(db)
    return service.refresh(payload.refresh_token)


@router.get("/me", response_model=PortalUserResponse)
def portal_me(
    portal_user: CustomerPortalUser = Depends(get_current_portal_user),
    db: Session = Depends(get_db),
) -> PortalUserResponse:
    tenant = db.get(Tenant, portal_user.tenant_id)
    service = PortalAuthService(db)
    return service.to_user_response(portal_user, tenant)  # type: ignore[arg-type]
