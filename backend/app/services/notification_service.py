"""Notification center business logic."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import (
    NotificationActor,
    NotificationBulkResult,
    NotificationListResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from app.services.notification_emitter import NotificationEmitter


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)
        self.emitter = NotificationEmitter(db)

    def _to_response(self, n) -> NotificationResponse:
        actor = None
        if n.actor:
            actor = NotificationActor(id=n.actor.id, full_name=n.actor.full_name, email=n.actor.email)
        return NotificationResponse(
            id=n.id,
            tenant_id=n.tenant_id,
            user_id=n.user_id,
            actor_id=n.actor_id,
            actor=actor,
            type=n.type,
            title=n.title,
            message=n.message,
            entity_type=n.entity_type,
            entity_id=n.entity_id,
            priority=n.priority,
            read=n.read,
            read_at=n.read_at,
            action_url=n.action_url,
            metadata=n.notification_metadata,
            archived_at=n.archived_at,
            created_at=n.created_at,
        )

    def list_notifications(
        self,
        ctx: TenantContext,
        *,
        q: str | None = None,
        category: str | None = None,
        unread_only: bool = False,
        cursor: str | None = None,
        page_size: int = 20,
    ) -> NotificationListResponse:
        self.emitter.scan_reminders(ctx.tenant.id, ctx.tenant.slug)
        self.db.commit()

        items, total, next_cursor, has_more = self.repo.list_notifications(
            ctx.tenant.id,
            ctx.membership.user_id,
            q=q,
            category=category,
            unread_only=unread_only,
            cursor=cursor,
            page_size=page_size,
        )
        unread = self.repo.unread_count(ctx.tenant.id, ctx.membership.user_id)
        return NotificationListResponse(
            items=[self._to_response(n) for n in items],
            total=total,
            unread_count=unread,
            next_cursor=next_cursor,
            has_more=has_more,
        )

    def unread_count(self, ctx: TenantContext) -> NotificationUnreadCountResponse:
        count = self.repo.unread_count(ctx.tenant.id, ctx.membership.user_id)
        return NotificationUnreadCountResponse(unread_count=count)

    def get_notification(self, ctx: TenantContext, notification_id: uuid.UUID) -> NotificationResponse:
        n = self.repo.get_by_id(ctx.tenant.id, ctx.membership.user_id, notification_id)
        if not n:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return self._to_response(n)

    def mark_read(self, ctx: TenantContext, notification_id: uuid.UUID) -> NotificationResponse:
        affected = self.repo.mark_read(ctx.tenant.id, ctx.membership.user_id, [notification_id])
        if not affected:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        self.db.commit()
        return self.get_notification(ctx, notification_id)

    def mark_all_read(self, ctx: TenantContext) -> NotificationBulkResult:
        affected = self.repo.mark_all_read(ctx.tenant.id, ctx.membership.user_id)
        self.db.commit()
        return NotificationBulkResult(affected=affected)

    def delete(self, ctx: TenantContext, notification_id: uuid.UUID) -> None:
        affected = self.repo.delete(ctx.tenant.id, ctx.membership.user_id, [notification_id])
        if not affected:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        self.db.commit()

    def archive(self, ctx: TenantContext, notification_id: uuid.UUID) -> NotificationResponse:
        affected = self.repo.archive(ctx.tenant.id, ctx.membership.user_id, [notification_id])
        if not affected:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        self.db.commit()
        n = self.repo.get_by_id(ctx.tenant.id, ctx.membership.user_id, notification_id)
        return self._to_response(n)

    def bulk_delete(self, ctx: TenantContext, ids: list[uuid.UUID]) -> NotificationBulkResult:
        affected = self.repo.delete(ctx.tenant.id, ctx.membership.user_id, ids)
        self.db.commit()
        return NotificationBulkResult(affected=affected)

    def bulk_archive(self, ctx: TenantContext, ids: list[uuid.UUID]) -> NotificationBulkResult:
        affected = self.repo.archive(ctx.tenant.id, ctx.membership.user_id, ids)
        self.db.commit()
        return NotificationBulkResult(affected=affected)
