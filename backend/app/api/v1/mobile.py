from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.mobile import (
    ConflictResolveRequest,
    MobileDashboardResponse,
    MobileSettingsResponse,
    MobileSettingsUpdate,
    OfflineQueueBatchRequest,
    OfflineQueueBatchResponse,
    OfflineQueueItemResponse,
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    SyncConflictResponse,
    SyncDataResponse,
    SyncResourceRequest,
    SyncSessionResponse,
)
from app.services.mobile_service import MobileService

router = APIRouter(prefix="/tenants/{slug}/mobile", tags=["mobile"])


@router.get("/dashboard", response_model=MobileDashboardResponse)
def get_mobile_dashboard(
    ctx: TenantContext = Depends(require_permission("mobile:read")),
    db: Session = Depends(get_db),
) -> MobileDashboardResponse:
    return MobileService(db).get_dashboard(ctx)


@router.get("/settings", response_model=MobileSettingsResponse)
def get_mobile_settings(
    ctx: TenantContext = Depends(require_permission("mobile:read")),
    db: Session = Depends(get_db),
) -> MobileSettingsResponse:
    return MobileService(db).get_settings(ctx)


@router.patch("/settings", response_model=MobileSettingsResponse)
def update_mobile_settings(
    payload: MobileSettingsUpdate,
    ctx: TenantContext = Depends(require_permission("mobile:write")),
    db: Session = Depends(get_db),
) -> MobileSettingsResponse:
    return MobileService(db).update_settings(ctx, payload)


@router.post("/offline-queue", response_model=OfflineQueueBatchResponse, status_code=status.HTTP_201_CREATED)
def enqueue_offline_changes(
    payload: OfflineQueueBatchRequest,
    ctx: TenantContext = Depends(require_permission("mobile:write")),
    db: Session = Depends(get_db),
) -> OfflineQueueBatchResponse:
    return MobileService(db).enqueue_offline_batch(ctx, payload)


@router.get("/offline-queue", response_model=list[OfflineQueueItemResponse])
def list_offline_queue(
    status_filter: str | None = Query(None, alias="status"),
    ctx: TenantContext = Depends(require_permission("mobile:read")),
    db: Session = Depends(get_db),
) -> list[OfflineQueueItemResponse]:
    return MobileService(db).list_offline_queue(ctx, status_filter)


@router.post("/offline-queue/process")
def process_offline_queue(
    ctx: TenantContext = Depends(require_permission("mobile:write")),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return MobileService(db).process_offline_queue(ctx)


@router.post("/sync", response_model=SyncDataResponse)
def sync_now(
    payload: SyncResourceRequest,
    ctx: TenantContext = Depends(require_permission("mobile:write")),
    db: Session = Depends(get_db),
) -> SyncDataResponse:
    return MobileService(db).sync_now(ctx, payload)


@router.get("/sync/history", response_model=list[SyncSessionResponse])
def list_sync_history(
    ctx: TenantContext = Depends(require_permission("mobile:read")),
    db: Session = Depends(get_db),
) -> list[SyncSessionResponse]:
    return MobileService(db).list_sync_history(ctx)


@router.get("/conflicts", response_model=list[SyncConflictResponse])
def list_conflicts(
    ctx: TenantContext = Depends(require_permission("mobile:read")),
    db: Session = Depends(get_db),
) -> list[SyncConflictResponse]:
    return MobileService(db).list_conflicts(ctx)


@router.post("/conflicts/{conflict_id}/resolve", response_model=SyncConflictResponse)
def resolve_conflict(
    conflict_id: UUID,
    payload: ConflictResolveRequest,
    ctx: TenantContext = Depends(require_permission("mobile:write")),
    db: Session = Depends(get_db),
) -> SyncConflictResponse:
    return MobileService(db).resolve_conflict(ctx, conflict_id, payload)


@router.post("/push/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
def subscribe_push(
    payload: PushSubscriptionCreate,
    ctx: TenantContext = Depends(require_permission("mobile:write")),
    db: Session = Depends(get_db),
) -> PushSubscriptionResponse:
    return MobileService(db).subscribe_push(ctx, payload)


@router.get("/push/subscriptions", response_model=list[PushSubscriptionResponse])
def list_push_subscriptions(
    ctx: TenantContext = Depends(require_permission("mobile:read")),
    db: Session = Depends(get_db),
) -> list[PushSubscriptionResponse]:
    return MobileService(db).list_push_subscriptions(ctx)


@router.delete("/push/subscriptions/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe_push(
    subscription_id: UUID,
    ctx: TenantContext = Depends(require_permission("mobile:write")),
    db: Session = Depends(get_db),
) -> None:
    MobileService(db).unsubscribe_push(ctx, subscription_id)
