from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.models.deal import DEAL_STAGE_LABELS, DEAL_STAGES
from app.schemas.deal import (
    DealBoardResponse,
    DealCreate,
    DealMetaResponse,
    DealMove,
    DealPipelineResponse,
    DealPositionUpdate,
    DealResponse,
    DealStageColumn,
    DealStageUpdate,
    DealStatisticsResponse,
    DealUpdate,
)
from app.services.deal_service import DealPipelineFilters, DealService

router = APIRouter(prefix="/tenants/{slug}/deals", tags=["deals"])


def _to_response(deal) -> DealResponse:
    assigned = None
    if deal.assigned_to:
        assigned = {
            "id": deal.assigned_to.id,
            "full_name": deal.assigned_to.full_name,
            "email": deal.assigned_to.email,
        }
    company = None
    if deal.company:
        company = {"id": deal.company.id, "company_name": deal.company.company_name}
    contact = None
    if deal.contact:
        contact = {
            "id": deal.contact.id,
            "first_name": deal.contact.first_name,
            "last_name": deal.contact.last_name,
        }
    return DealResponse(
        id=deal.id,
        tenant_id=deal.tenant_id,
        title=deal.title,
        description=deal.description,
        stage=deal.stage,
        position=deal.position,
        value=deal.value,
        currency=deal.currency,
        probability=deal.probability,
        expected_close_date=deal.expected_close_date,
        lead_id=deal.lead_id,
        company_id=deal.company_id,
        contact_id=deal.contact_id,
        assigned_to_id=deal.assigned_to_id,
        assigned_to=assigned,
        company=company,
        contact=contact,
        created_by_id=deal.created_by_id,
        created_at=deal.created_at,
        updated_at=deal.updated_at,
        closed_at=deal.closed_at,
    )


def _pipeline_filters(
    q: str | None = Query(default=None),
    owner_id: UUID | None = Query(default=None),
    company_id: UUID | None = Query(default=None),
    stage: str | None = Query(default=None),
    close_date_from: date | None = Query(default=None),
    close_date_to: date | None = Query(default=None),
    value_min: Decimal | None = Query(default=None, ge=0),
    value_max: Decimal | None = Query(default=None, ge=0),
) -> DealPipelineFilters:
    return DealPipelineFilters(
        q=q,
        owner_id=owner_id,
        company_id=company_id,
        stage=stage,
        close_date_from=close_date_from,
        close_date_to=close_date_to,
        value_min=value_min,
        value_max=value_max,
    )


def _to_pipeline_response(columns: list[dict], total: int) -> DealPipelineResponse:
    return DealPipelineResponse(
        stages=[
            DealStageColumn(
                slug=column["slug"],
                label=column["label"],
                deals=[_to_response(deal) for deal in column["deals"]],
            )
            for column in columns
        ],
        total=total,
    )


@router.get("/meta", response_model=DealMetaResponse)
def get_deal_meta(
    _: TenantContext = Depends(require_permission("deal:read")),
) -> DealMetaResponse:
    return DealMetaResponse(
        stages=[{"slug": stage, "label": DEAL_STAGE_LABELS[stage]} for stage in DEAL_STAGES]
    )


@router.get("/statistics", response_model=DealStatisticsResponse)
def get_deal_statistics(
    ctx: TenantContext = Depends(require_permission("deal:read")),
    db: Session = Depends(get_db),
) -> DealStatisticsResponse:
    stats = DealService(db).get_statistics(ctx.tenant.id)
    return DealStatisticsResponse(**stats)


@router.get("/pipeline", response_model=DealPipelineResponse)
def get_deal_pipeline(
    filters: DealPipelineFilters = Depends(_pipeline_filters),
    ctx: TenantContext = Depends(require_permission("deal:read")),
    db: Session = Depends(get_db),
) -> DealPipelineResponse:
    columns, total = DealService(db).get_pipeline(ctx.tenant.id, filters)
    return _to_pipeline_response(columns, total)


@router.get("/board", response_model=DealBoardResponse)
def get_deal_board(
    ctx: TenantContext = Depends(require_permission("deal:read")),
    db: Session = Depends(get_db),
) -> DealBoardResponse:
    columns, total = DealService(db).get_board(ctx.tenant.id)
    return DealBoardResponse(
        stages=[
            DealStageColumn(
                slug=column["slug"],
                label=column["label"],
                deals=[_to_response(deal) for deal in column["deals"]],
            )
            for column in columns
        ],
        total=total,
    )


@router.post("", response_model=DealResponse, status_code=201)
def create_deal(
    payload: DealCreate,
    ctx: TenantContext = Depends(require_permission("deal:write")),
    db: Session = Depends(get_db),
) -> DealResponse:
    deal = DealService(db).create_deal(ctx.tenant.id, payload, ctx.membership.user_id)
    return _to_response(deal)


@router.get("/{deal_id}", response_model=DealResponse)
def get_deal(
    deal_id: UUID,
    ctx: TenantContext = Depends(require_permission("deal:read")),
    db: Session = Depends(get_db),
) -> DealResponse:
    deal = DealService(db).get_deal(ctx.tenant.id, deal_id)
    return _to_response(deal)


@router.patch("/{deal_id}", response_model=DealResponse)
def update_deal(
    deal_id: UUID,
    payload: DealUpdate,
    ctx: TenantContext = Depends(require_permission("deal:write")),
    db: Session = Depends(get_db),
) -> DealResponse:
    deal = DealService(db).update_deal(
        ctx.tenant.id, deal_id, payload, ctx.membership.user_id
    )
    return _to_response(deal)


@router.patch("/{deal_id}/stage", response_model=DealResponse)
def update_deal_stage(
    deal_id: UUID,
    payload: DealStageUpdate,
    ctx: TenantContext = Depends(require_permission("deal:write")),
    db: Session = Depends(get_db),
) -> DealResponse:
    deal = DealService(db).update_stage(
        ctx.tenant.id, deal_id, payload.stage, ctx.membership.user_id
    )
    return _to_response(deal)


@router.patch("/{deal_id}/position", response_model=DealResponse)
def update_deal_position(
    deal_id: UUID,
    payload: DealPositionUpdate,
    ctx: TenantContext = Depends(require_permission("deal:write")),
    db: Session = Depends(get_db),
) -> DealResponse:
    deal = DealService(db).update_position(
        ctx.tenant.id, deal_id, payload.position, ctx.membership.user_id
    )
    return _to_response(deal)


@router.patch("/{deal_id}/move", response_model=DealResponse)
def move_deal(
    deal_id: UUID,
    payload: DealMove,
    ctx: TenantContext = Depends(require_permission("deal:write")),
    db: Session = Depends(get_db),
) -> DealResponse:
    deal = DealService(db).move_deal(
        ctx.tenant.id, deal_id, payload, ctx.membership.user_id
    )
    return _to_response(deal)


@router.post("/{deal_id}/duplicate", response_model=DealResponse, status_code=201)
def duplicate_deal(
    deal_id: UUID,
    ctx: TenantContext = Depends(require_permission("deal:write")),
    db: Session = Depends(get_db),
) -> DealResponse:
    deal = DealService(db).duplicate_deal(
        ctx.tenant.id, deal_id, ctx.membership.user_id
    )
    return _to_response(deal)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(
    deal_id: UUID,
    ctx: TenantContext = Depends(require_permission("deal:delete")),
    db: Session = Depends(get_db),
) -> None:
    DealService(db).delete_deal(ctx.tenant.id, deal_id, ctx.membership.user_id)
