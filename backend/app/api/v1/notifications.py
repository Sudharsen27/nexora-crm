from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, resolve_tenant_context, require_permission
from app.core.notification_ws import notification_manager
from app.core.security import safe_decode_token
from app.db.session import get_db
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import (
    NotificationBulkIds,
    NotificationBulkResult,
    NotificationListResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from app.services.notification_emitter import NotificationEmitter
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/tenants/{slug}/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    q: str | None = Query(default=None, max_length=200),
    category: str | None = Query(default=None, max_length=30),
    unread_only: bool = Query(default=False),
    cursor: str | None = Query(default=None),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("notification:read")),
    db: Session = Depends(get_db),
) -> NotificationListResponse:
    return NotificationService(db).list_notifications(
        ctx,
        q=q,
        category=category,
        unread_only=unread_only,
        cursor=cursor,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
def get_unread_count(
    ctx: TenantContext = Depends(require_permission("notification:read")),
    db: Session = Depends(get_db),
) -> NotificationUnreadCountResponse:
    return NotificationService(db).unread_count(ctx)


@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(
    notification_id: UUID,
    ctx: TenantContext = Depends(require_permission("notification:read")),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    return NotificationService(db).get_notification(ctx, notification_id)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    ctx: TenantContext = Depends(require_permission("notification:write")),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    return NotificationService(db).mark_read(ctx, notification_id)


@router.post("/mark-all-read", response_model=NotificationBulkResult)
def mark_all_read(
    ctx: TenantContext = Depends(require_permission("notification:write")),
    db: Session = Depends(get_db),
) -> NotificationBulkResult:
    return NotificationService(db).mark_all_read(ctx)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: UUID,
    ctx: TenantContext = Depends(require_permission("notification:delete")),
    db: Session = Depends(get_db),
) -> None:
    NotificationService(db).delete(ctx, notification_id)


@router.post("/{notification_id}/archive", response_model=NotificationResponse)
def archive_notification(
    notification_id: UUID,
    ctx: TenantContext = Depends(require_permission("notification:write")),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    return NotificationService(db).archive(ctx, notification_id)


@router.post("/bulk-delete", response_model=NotificationBulkResult)
def bulk_delete_notifications(
    body: NotificationBulkIds,
    ctx: TenantContext = Depends(require_permission("notification:delete")),
    db: Session = Depends(get_db),
) -> NotificationBulkResult:
    return NotificationService(db).bulk_delete(ctx, body.ids)


@router.post("/bulk-archive", response_model=NotificationBulkResult)
def bulk_archive_notifications(
    body: NotificationBulkIds,
    ctx: TenantContext = Depends(require_permission("notification:write")),
    db: Session = Depends(get_db),
) -> NotificationBulkResult:
    return NotificationService(db).bulk_archive(ctx, body.ids)


@router.websocket("/ws")
async def notifications_websocket(
    websocket: WebSocket,
    slug: str,
    token: str = Query(...),
    db: Session = Depends(get_db),
) -> None:
    payload = safe_decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4401)
        return
    user_id_str = payload.get("sub")
    if not user_id_str:
        await websocket.close(code=4401)
        return

    try:
        ctx = resolve_tenant_context(db, slug, UUID(user_id_str))
    except HTTPException:
        await websocket.close(code=4403)
        return

    if "notification:read" not in ctx.permissions:
        await websocket.close(code=4403)
        return

    emitter = NotificationEmitter(db)
    emitter.scan_reminders(ctx.tenant.id, ctx.tenant.slug)
    db.commit()

    await notification_manager.connect(websocket, ctx.tenant.id, ctx.membership.user_id)
    try:
        unread = NotificationRepository(db).unread_count(ctx.tenant.id, ctx.membership.user_id)
        await websocket.send_json({"event": "connected", "unread_count": unread})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await notification_manager.disconnect(websocket, ctx.tenant.id, ctx.membership.user_id)
