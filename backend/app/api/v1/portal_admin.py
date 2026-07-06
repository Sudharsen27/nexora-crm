"""Staff endpoints to manage customer portal users."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.portal import PortalCreateUserRequest, PortalUserResponse
from app.services.portal_auth_service import PortalAuthService

router = APIRouter(prefix="/tenants/{slug}/portal", tags=["portal-admin"])


@router.post("/users", response_model=PortalUserResponse)
def create_portal_user(
    payload: PortalCreateUserRequest,
    ctx: TenantContext = Depends(require_permission("contact:write")),
    db: Session = Depends(get_db),
) -> PortalUserResponse:
    service = PortalAuthService(db)
    portal_user = service.create_portal_user(
        ctx.tenant.id,
        payload,
        invited_by_id=ctx.membership.user_id,
    )
    return service.to_user_response(portal_user, ctx.tenant)
