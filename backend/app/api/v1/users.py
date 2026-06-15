from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.user import (
    MemberCreate,
    MemberListResponse,
    MemberResponse,
    MemberUpdate,
    RoleListResponse,
    RoleResponse,
)
from app.services.auth_service import TenantService

router = APIRouter(prefix="/tenants/{slug}", tags=["users"])


@router.get("/users", response_model=MemberListResponse)
def list_members(
    ctx: TenantContext = Depends(require_permission("user:read")),
    db: Session = Depends(get_db),
) -> MemberListResponse:
    members = TenantService(db).get_members(ctx.tenant.id)
    return MemberListResponse(items=[MemberResponse(**member) for member in members])


@router.post("/users", response_model=MemberResponse, status_code=201)
def add_member(
    payload: MemberCreate,
    ctx: TenantContext = Depends(require_permission("user:write")),
    db: Session = Depends(get_db),
) -> MemberResponse:
    member = TenantService(db).add_member(
        ctx.tenant.id,
        payload.email,
        payload.role_id,
        ctx.membership,
    )
    return MemberResponse(**member)


@router.patch("/users/{membership_id}", response_model=MemberResponse)
def update_member(
    membership_id: UUID,
    payload: MemberUpdate,
    ctx: TenantContext = Depends(require_permission("user:write")),
    db: Session = Depends(get_db),
) -> MemberResponse:
    member = TenantService(db).update_member(
        ctx.tenant.id,
        membership_id,
        role_id=payload.role_id,
        status_value=payload.status,
        actor_membership=ctx.membership,
    )
    return MemberResponse(**member)


@router.delete("/users/{membership_id}", status_code=204)
def remove_member(
    membership_id: UUID,
    ctx: TenantContext = Depends(require_permission("user:delete")),
    db: Session = Depends(get_db),
) -> None:
    TenantService(db).remove_member(ctx.tenant.id, membership_id, ctx.membership)


@router.get("/roles", response_model=RoleListResponse)
def list_roles(
    ctx: TenantContext = Depends(require_permission("role:read")),
    db: Session = Depends(get_db),
) -> RoleListResponse:
    roles = TenantService(db).list_roles(ctx.tenant.id)
    return RoleListResponse(items=[RoleResponse.model_validate(role) for role in roles])
