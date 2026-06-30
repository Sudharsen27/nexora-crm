from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.models.company import COMPANY_INDUSTRIES, COMPANY_SORT_FIELDS
from app.schemas.company import (
    CompanyCreate,
    CompanyListResponse,
    CompanyMetaResponse,
    CompanyResponse,
    CompanyUpdate,
)
from app.schemas.deal import DealResponse
from app.services.company_service import CompanyService, paginate

router = APIRouter(prefix="/tenants/{slug}/companies", tags=["companies"])


def _to_response(company) -> CompanyResponse:
    owner = None
    if company.owner:
        owner = {
            "id": company.owner.id,
            "full_name": company.owner.full_name,
            "email": company.owner.email,
        }
    return CompanyResponse(
        id=company.id,
        tenant_id=company.tenant_id,
        company_name=company.company_name,
        company_code=company.company_code,
        industry=company.industry,
        website=company.website,
        email=company.email,
        phone=company.phone,
        address=company.address,
        city=company.city,
        state=company.state,
        country=company.country,
        postal_code=company.postal_code,
        annual_revenue=company.annual_revenue,
        employee_count=company.employee_count,
        owner_id=company.owner_id,
        owner=owner,
        description=company.description,
        created_by_id=company.created_by_id,
        created_at=company.created_at,
        updated_at=company.updated_at,
    )


@router.get("/meta", response_model=CompanyMetaResponse)
def get_company_meta(
    _: TenantContext = Depends(require_permission("company:read")),
) -> CompanyMetaResponse:
    return CompanyMetaResponse(
        industries=list(COMPANY_INDUSTRIES),
        sort_fields=list(COMPANY_SORT_FIELDS),
    )


@router.get("", response_model=CompanyListResponse)
def list_companies(
    q: str | None = Query(default=None, max_length=200),
    industry: str | None = Query(default=None, max_length=100),
    owner_id: UUID | None = Query(default=None),
    city: str | None = Query(default=None, max_length=100),
    country: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    ctx: TenantContext = Depends(require_permission("company:read")),
    db: Session = Depends(get_db),
) -> CompanyListResponse:
    service = CompanyService(db)
    companies, total = service.list_companies(
        ctx.tenant.id,
        q=q,
        industry=industry,
        owner_id=owner_id,
        city=city,
        country=country,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    meta = paginate(total, page, page_size)
    return CompanyListResponse(
        items=[_to_response(company) for company in companies],
        **meta,
    )


@router.post("", response_model=CompanyResponse, status_code=201)
def create_company(
    payload: CompanyCreate,
    ctx: TenantContext = Depends(require_permission("company:write")),
    db: Session = Depends(get_db),
) -> CompanyResponse:
    company = CompanyService(db).create_company(
        ctx.tenant.id, payload, ctx.membership.user_id
    )
    return _to_response(company)


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: UUID,
    ctx: TenantContext = Depends(require_permission("company:read")),
    db: Session = Depends(get_db),
) -> CompanyResponse:
    company = CompanyService(db).get_company(ctx.tenant.id, company_id)
    return _to_response(company)


@router.get("/{company_id}/deals", response_model=list[DealResponse])
def list_company_deals(
    company_id: UUID,
    ctx: TenantContext = Depends(require_permission("company:read")),
    db: Session = Depends(get_db),
) -> list[DealResponse]:
    from app.api.v1.deals import _to_response as deal_to_response

    deals = CompanyService(db).list_company_deals(ctx.tenant.id, company_id)
    return [deal_to_response(deal) for deal in deals]


@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: UUID,
    payload: CompanyUpdate,
    ctx: TenantContext = Depends(require_permission("company:write")),
    db: Session = Depends(get_db),
) -> CompanyResponse:
    company = CompanyService(db).update_company(ctx.tenant.id, company_id, payload, ctx.membership.user_id)
    return _to_response(company)


@router.delete("/{company_id}", status_code=204)
def delete_company(
    company_id: UUID,
    ctx: TenantContext = Depends(require_permission("company:delete")),
    db: Session = Depends(get_db),
) -> None:
    CompanyService(db).delete_company(ctx.tenant.id, company_id, ctx.membership.user_id)
