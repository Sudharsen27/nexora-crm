from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.activity import (
    ActivityBulkIds,
    ActivityBulkResult,
    ActivityCreate,
    ActivityEntityRef,
    ActivityListResponse,
    ActivityResponse,
    ActivityUpdate,
)
from app.services.activity_service import ActivityService, paginate

router = APIRouter(prefix="/tenants/{slug}/activities", tags=["activities"])


def _actor_dict(user) -> dict | None:
    if not user:
        return None
    return {"id": user.id, "full_name": user.full_name, "email": user.email}


def _to_response(activity, entity_ref=None) -> ActivityResponse:
    actor = _actor_dict(activity.created_by)
    entity = None
    if entity_ref:
        entity = ActivityEntityRef(
            entity_type=entity_ref.entity_type,
            entity_id=entity_ref.entity_id,
            display_name=entity_ref.display_name,
            href_path=entity_ref.href_path,
        )
    return ActivityResponse(
        id=activity.id,
        tenant_id=activity.tenant_id,
        entity_type=activity.entity_type,
        entity_id=activity.entity_id,
        activity_type=activity.activity_type,
        action=activity.action,
        title=activity.title,
        description=activity.description,
        icon=activity.icon,
        color=activity.color,
        metadata=activity.activity_metadata,
        actor_id=activity.created_by_id,
        actor=actor,
        created_by_id=activity.created_by_id,
        created_by=actor,
        entity=entity,
        created_at=activity.created_at,
        scheduled_at=activity.scheduled_at,
        archived_at=activity.archived_at,
    )


def _list_response(
    service: ActivityService,
    ctx: TenantContext,
    activities: list,
    total: int,
    *,
    page: int | None = None,
    page_size: int | None = None,
    next_cursor: str | None = None,
    has_more: bool = False,
) -> ActivityListResponse:
    refs = service.resolve_entities(ctx.tenant.id, ctx.tenant.slug, activities)
    items = [
        _to_response(a, refs.get((a.entity_type, a.entity_id))) for a in activities
    ]
    meta = paginate(total, page, page_size) if page and page_size else {}
    return ActivityListResponse(
        items=items,
        total=total,
        page=meta.get("page"),
        page_size=meta.get("page_size"),
        pages=meta.get("pages"),
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.get("", response_model=ActivityListResponse)
def list_activities(
    q: str | None = Query(default=None, max_length=200),
    entity_type: str | None = Query(default=None, max_length=30),
    entity_id: UUID | None = Query(default=None),
    activity_type: str | None = Query(default=None, max_length=50),
    action: str | None = Query(default=None, max_length=50),
    actor_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    category: str | None = Query(default=None, max_length=30),
    page: int | None = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    sort: str = Query(default="desc", pattern="^(asc|desc)$"),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    if cursor:
        activities, total, next_cursor, has_more = service.list_activities(
            ctx.tenant.id,
            q=q,
            entity_type=entity_type,
            entity_id=entity_id,
            activity_type=activity_type,
            action=action,
            actor_id=actor_id,
            date_from=date_from,
            date_to=date_to,
            category=category,
            page_size=page_size,
            cursor=cursor,
            sort=sort,
        )
        return _list_response(
            service, ctx, activities, total,
            page_size=page_size, next_cursor=next_cursor, has_more=has_more,
        )

    activities, total, _, _ = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type=entity_type,
        entity_id=entity_id,
        activity_type=activity_type,
        action=action,
        actor_id=actor_id,
        date_from=date_from,
        date_to=date_to,
        category=category,
        page=page or 1,
        page_size=page_size,
        sort=sort,
    )
    return _list_response(
        service, ctx, activities, total, page=page or 1, page_size=page_size,
    )


@router.post("", response_model=ActivityResponse, status_code=201)
def create_activity(
    payload: ActivityCreate,
    ctx: TenantContext = Depends(require_permission("activity:write")),
    db: Session = Depends(get_db),
) -> ActivityResponse:
    service = ActivityService(db)
    activity = service.create_activity(
        ctx.tenant.id, payload, ctx.membership.user_id
    )
    refs = service.resolve_entities(ctx.tenant.id, ctx.tenant.slug, [activity])
    return _to_response(activity, refs.get((activity.entity_type, activity.entity_id)))


@router.post("/bulk-delete", response_model=ActivityBulkResult)
def bulk_delete_activities(
    payload: ActivityBulkIds,
    ctx: TenantContext = Depends(require_permission("activity:delete")),
    db: Session = Depends(get_db),
) -> ActivityBulkResult:
    count = ActivityService(db).bulk_delete(ctx.tenant.id, payload.ids)
    return ActivityBulkResult(affected=count)


@router.post("/bulk-archive", response_model=ActivityBulkResult)
def bulk_archive_activities(
    payload: ActivityBulkIds,
    ctx: TenantContext = Depends(require_permission("activity:write")),
    db: Session = Depends(get_db),
) -> ActivityBulkResult:
    count = ActivityService(db).bulk_archive(ctx.tenant.id, payload.ids)
    return ActivityBulkResult(affected=count)


@router.get("/lead/{lead_id}", response_model=ActivityListResponse)
def list_lead_activities(
    lead_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    activity_type: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total, _, _ = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type="lead",
        entity_id=lead_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    return _list_response(service, ctx, activities, total, page=page, page_size=page_size)


@router.get("/contact/{contact_id}", response_model=ActivityListResponse)
def list_contact_activities(
    contact_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    activity_type: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total, _, _ = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type="contact",
        entity_id=contact_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    return _list_response(service, ctx, activities, total, page=page, page_size=page_size)


@router.get("/deal/{deal_id}", response_model=ActivityListResponse)
def list_deal_activities(
    deal_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    activity_type: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total, _, _ = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type="deal",
        entity_id=deal_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    return _list_response(service, ctx, activities, total, page=page, page_size=page_size)


@router.get("/company/{company_id}", response_model=ActivityListResponse)
def list_company_activities(
    company_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    activity_type: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    service = ActivityService(db)
    activities, total, _, _ = service.list_activities(
        ctx.tenant.id,
        q=q,
        entity_type="company",
        entity_id=company_id,
        activity_type=activity_type,
        page=page,
        page_size=page_size,
    )
    return _list_response(service, ctx, activities, total, page=page, page_size=page_size)


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: UUID,
    ctx: TenantContext = Depends(require_permission("activity:read")),
    db: Session = Depends(get_db),
) -> ActivityResponse:
    service = ActivityService(db)
    activity = service.get_activity(ctx.tenant.id, activity_id)
    refs = service.resolve_entities(ctx.tenant.id, ctx.tenant.slug, [activity])
    return _to_response(activity, refs.get((activity.entity_type, activity.entity_id)))


@router.patch("/{activity_id}", response_model=ActivityResponse)
def update_activity(
    activity_id: UUID,
    payload: ActivityUpdate,
    ctx: TenantContext = Depends(require_permission("activity:write")),
    db: Session = Depends(get_db),
) -> ActivityResponse:
    service = ActivityService(db)
    activity = service.update_activity(ctx.tenant.id, activity_id, payload)
    refs = service.resolve_entities(ctx.tenant.id, ctx.tenant.slug, [activity])
    return _to_response(activity, refs.get((activity.entity_type, activity.entity_id)))


@router.delete("/{activity_id}", status_code=204)
def delete_activity(
    activity_id: UUID,
    ctx: TenantContext = Depends(require_permission("activity:delete")),
    db: Session = Depends(get_db),
) -> None:
    ActivityService(db).delete_activity(ctx.tenant.id, activity_id)
