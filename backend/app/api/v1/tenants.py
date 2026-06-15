from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, get_current_user, get_tenant_context, require_permission
from app.db.session import get_db
from app.models import User
from app.schemas.tenant import TenantCreate, TenantListResponse, TenantResponse, TenantUpdate
from app.services.auth_service import AuthService, TenantService

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("", response_model=TenantResponse, status_code=201)
def create_tenant(
    payload: TenantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TenantResponse:
    tenant = TenantService(db).create_tenant(current_user, payload.name, payload.slug)
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        status=tenant.status,
        role="owner",
    )


@router.get("", response_model=TenantListResponse)
def list_tenants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TenantListResponse:
    items = [
        TenantResponse(
            id=tenant.id,
            name=tenant.name,
            slug=tenant.slug,
            status=tenant.status,
            role=role_slug,
        )
        for tenant, role_slug in TenantService(db).list_user_tenants(current_user)
    ]
    return TenantListResponse(items=items)


@router.get("/{slug}", response_model=TenantResponse)
def get_tenant(ctx: TenantContext = Depends(require_permission("tenant:read"))) -> TenantResponse:
    return TenantResponse(
        id=ctx.tenant.id,
        name=ctx.tenant.name,
        slug=ctx.tenant.slug,
        status=ctx.tenant.status,
        role=ctx.role.slug,
    )


@router.patch("/{slug}", response_model=TenantResponse)
def update_tenant(
    payload: TenantUpdate,
    ctx: TenantContext = Depends(require_permission("tenant:write")),
    db: Session = Depends(get_db),
) -> TenantResponse:
    if payload.name is not None:
        ctx.tenant.name = payload.name.strip()
    db.commit()
    db.refresh(ctx.tenant)
    return TenantResponse(
        id=ctx.tenant.id,
        name=ctx.tenant.name,
        slug=ctx.tenant.slug,
        status=ctx.tenant.status,
        role=ctx.role.slug,
    )
