from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.contact import ContactCreate, ContactListResponse, ContactResponse, ContactUpdate
from app.services.contact_service import ContactService, paginate

router = APIRouter(prefix="/tenants/{slug}/contacts", tags=["contacts"])


def _to_response(contact) -> ContactResponse:
    assigned = None
    if contact.assigned_to:
        assigned = {
            "id": contact.assigned_to.id,
            "full_name": contact.assigned_to.full_name,
            "email": contact.assigned_to.email,
        }
    lead_ref = None
    if contact.lead:
        lead_ref = {
            "id": contact.lead.id,
            "first_name": contact.lead.first_name,
            "last_name": contact.lead.last_name,
            "status": contact.lead.status,
        }
    company_ref = None
    if contact.linked_company:
        company_ref = {
            "id": contact.linked_company.id,
            "company_name": contact.linked_company.company_name,
            "company_code": contact.linked_company.company_code,
        }
    return ContactResponse(
        id=contact.id,
        tenant_id=contact.tenant_id,
        lead_id=contact.lead_id,
        company_id=contact.company_id,
        first_name=contact.first_name,
        last_name=contact.last_name,
        email=contact.email,
        phone=contact.phone,
        company=contact.company,
        job_title=contact.job_title,
        notes=contact.notes,
        assigned_to_id=contact.assigned_to_id,
        assigned_to=assigned,
        lead=lead_ref,
        linked_company=company_ref,
        created_by_id=contact.created_by_id,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


@router.get("", response_model=ContactListResponse)
def list_contacts(
    q: str | None = Query(default=None, max_length=200),
    company: str | None = Query(default=None, max_length=255),
    company_id: UUID | None = Query(default=None),
    assigned_to_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    ctx: TenantContext = Depends(require_permission("contact:read")),
    db: Session = Depends(get_db),
) -> ContactListResponse:
    service = ContactService(db)
    contacts, total = service.list_contacts(
        ctx.tenant.id,
        q=q,
        company=company,
        company_id=company_id,
        assigned_to_id=assigned_to_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    meta = paginate(total, page, page_size)
    return ContactListResponse(
        items=[_to_response(contact) for contact in contacts],
        **meta,
    )


@router.post("", response_model=ContactResponse, status_code=201)
def create_contact(
    payload: ContactCreate,
    ctx: TenantContext = Depends(require_permission("contact:write")),
    db: Session = Depends(get_db),
) -> ContactResponse:
    contact = ContactService(db).create_contact(
        ctx.tenant.id, payload, ctx.membership.user_id
    )
    return _to_response(contact)


@router.post("/convert-lead/{lead_id}", response_model=ContactResponse, status_code=201)
def convert_lead_to_contact(
    lead_id: UUID,
    ctx: TenantContext = Depends(require_permission("contact:write")),
    db: Session = Depends(get_db),
) -> ContactResponse:
    contact = ContactService(db).convert_lead(
        ctx.tenant.id, lead_id, ctx.membership.user_id
    )
    return _to_response(contact)


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: UUID,
    ctx: TenantContext = Depends(require_permission("contact:read")),
    db: Session = Depends(get_db),
) -> ContactResponse:
    contact = ContactService(db).get_contact(ctx.tenant.id, contact_id)
    return _to_response(contact)


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: UUID,
    payload: ContactUpdate,
    ctx: TenantContext = Depends(require_permission("contact:write")),
    db: Session = Depends(get_db),
) -> ContactResponse:
    contact = ContactService(db).update_contact(ctx.tenant.id, contact_id, payload)
    return _to_response(contact)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: UUID,
    ctx: TenantContext = Depends(require_permission("contact:delete")),
    db: Session = Depends(get_db),
) -> None:
    ContactService(db).delete_contact(ctx.tenant.id, contact_id)
