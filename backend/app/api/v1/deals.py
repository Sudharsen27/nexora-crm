from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.models.deal import DEAL_STAGE_LABELS, DEAL_STAGES
from app.schemas.deal import (
    DealBoardResponse,
    DealCreate,
    DealMetaResponse,
    DealMove,
    DealResponse,
    DealStageColumn,
    DealUpdate,
)
from app.services.deal_service import DealService

router = APIRouter(prefix="/tenants/{slug}/deals", tags=["deals"])


def _to_response(deal) -> DealResponse:
    assigned = None
    if deal.assigned_to:
        assigned = {
            "id": deal.assigned_to.id,
            "full_name": deal.assigned_to.full_name,
            "email": deal.assigned_to.email,
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
        expected_close_date=deal.expected_close_date,
        lead_id=deal.lead_id,
        assigned_to_id=deal.assigned_to_id,
        assigned_to=assigned,
        created_by_id=deal.created_by_id,
        created_at=deal.created_at,
        updated_at=deal.updated_at,
        closed_at=deal.closed_at,
    )


@router.get("/meta", response_model=DealMetaResponse)
def get_deal_meta(
    _: TenantContext = Depends(require_permission("deal:read")),
) -> DealMetaResponse:
    return DealMetaResponse(
        stages=[{"slug": stage, "label": DEAL_STAGE_LABELS[stage]} for stage in DEAL_STAGES]
    )


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
    deal = DealService(db).update_deal(ctx.tenant.id, deal_id, payload)
    return _to_response(deal)


@router.patch("/{deal_id}/move", response_model=DealResponse)
def move_deal(
    deal_id: UUID,
    payload: DealMove,
    ctx: TenantContext = Depends(require_permission("deal:write")),
    db: Session = Depends(get_db),
) -> DealResponse:
    deal = DealService(db).move_deal(ctx.tenant.id, deal_id, payload)
    return _to_response(deal)


@router.delete("/{deal_id}", status_code=204)
def delete_deal(
    deal_id: UUID,
    ctx: TenantContext = Depends(require_permission("deal:delete")),
    db: Session = Depends(get_db),
) -> None:
    DealService(db).delete_deal(ctx.tenant.id, deal_id)
