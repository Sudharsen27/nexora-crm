from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.activity import ActivityCreate, ActivityListResponse, ActivityResponse
from app.services.activity_service import ActivityService, paginate

router = APIRouter(prefix="/tenants/{slug}/activities", tags=["activities"])


def _to_response(activity) -> ActivityResponse:
    creator = None
    if activity.created_by:
        creator = {
            "id": activity.created_by.id,
            "full_name": activity.created_by.full_name,
            "email": activity.created_by.email,
        }
    return ActivityResponse(
        id=activity.id,
        tenant_id=activity.tenant_id,
        entity_type=activity.entity_type,
        entity_id=activity.entity_id,
        activity_type=activity.activity_type,
        description=activity.description,
        metadata=activity.activity_metadata,
        created_by_id=activity.created_by_id,
        created_by=creator,
        created_at=activity.created_at,
        scheduled_at=activity.scheduled_at,
    )


@router.get("", response_model=ActivityListResponse)
def list_activities(
    q: str | None = Query(default=None, max_length=200),
    entity_type: str | None = Query(default=None, max_length=30),
    entity_id: UUID | None = Query(default=None),
    activity_type: str | None = Query(default=None, max_length=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type=entity_type,
        entity_id=entity_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    meta = paginate(total, page, page_size)
    return ActivityListResponse(
        items=[_to_response(activity) for activity in activities],
        **meta,
    )


@router.post("", response_model=ActivityResponse, status_code=201)
def create_activity(
    payload: ActivityCreate,
    ctx: TenantContext = Depends(require_permission("activity:write")),
    db: Session = Depends(get_db),
) -> ActivityResponse:
    activity = ActivityService(db).create_activity(
        ctx.tenant.id, payload, ctx.membership.user_id
    )
    return _to_response(activity)


@router.get("/lead/{lead_id}", response_model=ActivityListResponse)
def list_lead_activities(
    lead_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    activity_type: str | None = Query(default=None, max_length=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type="lead",
        entity_id=lead_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    meta = paginate(total, page, page_size)
    return ActivityListResponse(
        items=[_to_response(activity) for activity in activities],
        **meta,
    )


@router.get("/contact/{contact_id}", response_model=ActivityListResponse)
def list_contact_activities(
    contact_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    activity_type: str | None = Query(default=None, max_length=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type="contact",
        entity_id=contact_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    meta = paginate(total, page, page_size)
    return ActivityListResponse(
        items=[_to_response(activity) for activity in activities],
        **meta,
    )


@router.get("/deal/{deal_id}", response_model=ActivityListResponse)
def list_deal_activities(
    deal_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    activity_type: str | None = Query(default=None, max_length=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type="deal",
        entity_id=deal_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    meta = paginate(total, page, page_size)
    return ActivityListResponse(
        items=[_to_response(activity) for activity in activities],
        **meta,
    )


@router.get("/company/{company_id}", response_model=ActivityListResponse)
def list_company_activities(
    company_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    activity_type: str | None = Query(default=None, max_length=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type="company",
        entity_id=company_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    meta = paginate(total, page, page_size)
    return ActivityListResponse(
        items=[_to_response(activity) for activity in activities],
        **meta,
    )


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: UUID,
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityResponse:
    activity = ActivityService(db).get_activity(ctx.tenant.id, activity_id)
    return _to_response(activity)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(
    activity_id: UUID,
    ctx: TenantContext = Depends(require_permission("activity:delete")),
    db: Session = Depends(get_db),
) -> None:
    ActivityService(db).delete_activity(ctx.tenant.id, activity_id)
