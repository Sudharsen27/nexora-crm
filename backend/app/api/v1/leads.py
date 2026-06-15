from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.models.lead import LEAD_SOURCES, LEAD_STATUSES
from app.schemas.lead import LeadCreate, LeadListResponse, LeadMetaResponse, LeadResponse, LeadUpdate
from app.services.lead_service import LeadService, paginate

router = APIRouter(prefix="/tenants/{slug}/leads", tags=["leads"])


def _to_response(lead) -> LeadResponse:
    assigned = None
    if lead.assigned_to:
        assigned = {
            "id": lead.assigned_to.id,
            "full_name": lead.assigned_to.full_name,
            "email": lead.assigned_to.email,
        }
    return LeadResponse(
        id=lead.id,
        tenant_id=lead.tenant_id,
        first_name=lead.first_name,
        last_name=lead.last_name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        job_title=lead.job_title,
        status=lead.status,
        source=lead.source,
        estimated_value=lead.estimated_value,
        notes=lead.notes,
        assigned_to_id=lead.assigned_to_id,
        assigned_to=assigned,
        created_by_id=lead.created_by_id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.get("/meta", response_model=LeadMetaResponse)
def get_lead_meta(
    _: TenantContext = Depends(require_permission("lead:read")),
) -> LeadMetaResponse:
    return LeadMetaResponse(statuses=list(LEAD_STATUSES), sources=list(LEAD_SOURCES))


@router.get("", response_model=LeadListResponse)
def list_leads(
    q: str | None = Query(default=None, max_length=200),
    status: str | None = Query(default=None, alias="status"),
    source: str | None = Query(default=None),
    assigned_to_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("lead:read")),
    db: Session = Depends(get_db),
) -> LeadListResponse:
    service = LeadService(db)
    leads, total = service.list_leads(
        ctx.tenant.id,
        q=q,
        status_filter=status,
        source=source,
        assigned_to_id=assigned_to_id,
        page=page,
        page_size=page_size,
    )
    meta = paginate(total, page, page_size)
    return LeadListResponse(
        items=[_to_response(lead) for lead in leads],
        **meta,
    )


@router.post("", response_model=LeadResponse, status_code=201)
def create_lead(
    payload: LeadCreate,
    ctx: TenantContext = Depends(require_permission("lead:write")),
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService(db).create_lead(ctx.tenant.id, payload, ctx.membership.user_id)
    return _to_response(lead)


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: UUID,
    ctx: TenantContext = Depends(require_permission("lead:read")),
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService(db).get_lead(ctx.tenant.id, lead_id)
    return _to_response(lead)


@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: UUID,
    payload: LeadUpdate,
    ctx: TenantContext = Depends(require_permission("lead:write")),
    db: Session = Depends(get_db),
) -> LeadResponse:
    lead = LeadService(db).update_lead(ctx.tenant.id, lead_id, payload)
    return _to_response(lead)


@router.delete("/{lead_id}", status_code=204)
def delete_lead(
    lead_id: UUID,
    ctx: TenantContext = Depends(require_permission("lead:delete")),
    db: Session = Depends(get_db),
) -> None:
    LeadService(db).delete_lead(ctx.tenant.id, lead_id)
