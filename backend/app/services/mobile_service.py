"""Enterprise Mobile PWA & Offline CRM service (Phase 15)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.deps import TenantContext
from app.db.mixins import utcnow
from app.models import (
    Activity,
    Company,
    Contact,
    Deal,
    Lead,
    Meeting,
    Notification,
    Task,
)
from app.models.mobile import (
    CACHEABLE_RESOURCES,
    MobileSettings,
    OfflineQueueItem,
    PushSubscription,
    SyncConflict,
    SyncSession,
)
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
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_user


def _serialize(obj: Any) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, uuid.UUID):
            data[col.name] = str(val)
        elif isinstance(val, datetime):
            data[col.name] = val.isoformat()
        else:
            data[col.name] = val
    return data


class MobileService:
    def __init__(self, db: Session):
        self.db = db

    def _get_or_create_settings(self, ctx: TenantContext) -> MobileSettings:
        settings = self.db.scalar(
            select(MobileSettings).where(
                MobileSettings.tenant_id == ctx.tenant.id,
                MobileSettings.user_id == ctx.membership.user_id,
            )
        )
        if settings:
            return settings
        settings = MobileSettings(
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            cache_resources=list(CACHEABLE_RESOURCES),
        )
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def get_settings(self, ctx: TenantContext) -> MobileSettingsResponse:
        return MobileSettingsResponse.model_validate(self._get_or_create_settings(ctx))

    def update_settings(self, ctx: TenantContext, payload: MobileSettingsUpdate) -> MobileSettingsResponse:
        settings = self._get_or_create_settings(ctx)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(settings, field, value)
        self.db.commit()
        self.db.refresh(settings)
        return MobileSettingsResponse.model_validate(settings)

    def get_dashboard(self, ctx: TenantContext) -> MobileDashboardResponse:
        settings = self._get_or_create_settings(ctx)
        pending = self.db.scalar(
            select(func.count())
            .select_from(OfflineQueueItem)
            .where(
                OfflineQueueItem.tenant_id == ctx.tenant.id,
                OfflineQueueItem.user_id == ctx.membership.user_id,
                OfflineQueueItem.status == "pending",
            )
        ) or 0
        conflicts = self.db.scalar(
            select(func.count())
            .select_from(SyncConflict)
            .where(
                SyncConflict.tenant_id == ctx.tenant.id,
                SyncConflict.user_id == ctx.membership.user_id,
                SyncConflict.status == "open",
            )
        ) or 0
        push_count = self.db.scalar(
            select(func.count())
            .select_from(PushSubscription)
            .where(
                PushSubscription.tenant_id == ctx.tenant.id,
                PushSubscription.user_id == ctx.membership.user_id,
                PushSubscription.status == "active",
            )
        ) or 0
        sessions = list(
            self.db.scalars(
                select(SyncSession)
                .where(
                    SyncSession.tenant_id == ctx.tenant.id,
                    SyncSession.user_id == ctx.membership.user_id,
                )
                .order_by(desc(SyncSession.created_at))
                .limit(5)
            ).all()
        )
        return MobileDashboardResponse(
            offline_queue_pending=pending,
            open_conflicts=conflicts,
            last_sync_at=settings.last_sync_at,
            storage_used_bytes=settings.storage_used_bytes,
            push_subscriptions=push_count,
            recent_sessions=[SyncSessionResponse.model_validate(s) for s in sessions],
            cacheable_resources=list(CACHEABLE_RESOURCES),
        )

    def enqueue_offline_batch(
        self, ctx: TenantContext, payload: OfflineQueueBatchRequest
    ) -> OfflineQueueBatchResponse:
        created: list[OfflineQueueItem] = []
        for item in payload.items:
            existing = self.db.scalar(
                select(OfflineQueueItem).where(
                    OfflineQueueItem.tenant_id == ctx.tenant.id,
                    OfflineQueueItem.user_id == ctx.membership.user_id,
                    OfflineQueueItem.client_id == item.client_id,
                )
            )
            if existing:
                continue
            row = OfflineQueueItem(
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                client_id=item.client_id,
                resource=item.resource,
                action=item.action,
                entity_id=item.entity_id,
                payload=item.payload,
            )
            self.db.add(row)
            created.append(row)
        self.db.commit()
        for row in created:
            self.db.refresh(row)
        return OfflineQueueBatchResponse(
            accepted=len(created),
            items=[OfflineQueueItemResponse.model_validate(r) for r in created],
        )

    def list_offline_queue(self, ctx: TenantContext, status_filter: str | None = None) -> list[OfflineQueueItemResponse]:
        query = select(OfflineQueueItem).where(
            OfflineQueueItem.tenant_id == ctx.tenant.id,
            OfflineQueueItem.user_id == ctx.membership.user_id,
        )
        if status_filter:
            query = query.where(OfflineQueueItem.status == status_filter)
        rows = self.db.scalars(query.order_by(desc(OfflineQueueItem.created_at)).limit(100)).all()
        return [OfflineQueueItemResponse.model_validate(r) for r in rows]

    def _process_queue_item(self, ctx: TenantContext, item: OfflineQueueItem) -> bool:
        item.status = "processing"
        self.db.flush()
        try:
            resource = item.resource
            action = item.action
            payload = item.payload or {}

            if resource == "leads" and action == "create":
                lead = Lead(
                    tenant_id=ctx.tenant.id,
                    first_name=payload.get("first_name", "Offline"),
                    last_name=payload.get("last_name", "Lead"),
                    email=payload.get("email"),
                    phone=payload.get("phone"),
                    company=payload.get("company"),
                    status=payload.get("status", "new"),
                    source=payload.get("source", "offline"),
                    created_by_id=ctx.membership.user_id,
                )
                self.db.add(lead)
                self.db.flush()
                item.entity_id = str(lead.id)
            elif resource == "tasks" and action == "create":
                task = Task(
                    tenant_id=ctx.tenant.id,
                    title=payload.get("title", "Offline task"),
                    description=payload.get("description"),
                    status=payload.get("status", "pending"),
                    priority=payload.get("priority", "medium"),
                    assigned_to_id=ctx.membership.user_id,
                    created_by_id=ctx.membership.user_id,
                )
                self.db.add(task)
                self.db.flush()
                item.entity_id = str(task.id)
            elif resource == "notes" and action == "create":
                activity = Activity(
                    tenant_id=ctx.tenant.id,
                    activity_type="note",
                    title=payload.get("title", "Offline note"),
                    description=payload.get("description", ""),
                    entity_type=payload.get("entity_type", "contact"),
                    entity_id=uuid.UUID(payload["entity_id"]) if payload.get("entity_id") else ctx.membership.user_id,
                    created_by_id=ctx.membership.user_id,
                )
                self.db.add(activity)
                self.db.flush()
                item.entity_id = str(activity.id)
            else:
                item.status = "failed"
                item.error_message = f"Unsupported offline action: {resource}.{action}"
                item.retry_count += 1
                return False

            item.status = "completed"
            item.processed_at = utcnow()
            return True
        except Exception as exc:
            item.status = "failed"
            item.error_message = str(exc)[:500]
            item.retry_count += 1
            return False

    def process_offline_queue(self, ctx: TenantContext) -> dict[str, int]:
        pending = list(
            self.db.scalars(
                select(OfflineQueueItem).where(
                    OfflineQueueItem.tenant_id == ctx.tenant.id,
                    OfflineQueueItem.user_id == ctx.membership.user_id,
                    OfflineQueueItem.status.in_(("pending", "failed")),
                    OfflineQueueItem.retry_count < OfflineQueueItem.max_retries,
                )
                .order_by(OfflineQueueItem.created_at)
                .limit(50)
            ).all()
        )
        completed = failed = 0
        for item in pending:
            if self._process_queue_item(ctx, item):
                completed += 1
            else:
                failed += 1
        self.db.commit()
        if completed:
            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                type="sync_completed",
                title="Offline sync completed",
                message=f"{completed} offline change(s) synced successfully.",
                actor_id=ctx.membership.user_id,
            )
            ActivityLogger(self.db).log(
                tenant_id=ctx.tenant.id,
                actor_id=ctx.membership.user_id,
                entity_type="mobile",
                entity_id=ctx.membership.user_id,
                action="offline_sync_completed",
                title="Offline sync completed",
                description=f"Synced {completed} offline item(s)",
            )
        if failed:
            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                type="sync_failed",
                title="Offline sync failed",
                message=f"{failed} offline change(s) could not be synced.",
                actor_id=ctx.membership.user_id,
            )
        return {"completed": completed, "failed": failed, "processed": len(pending)}

    def _fetch_resource_data(
        self, ctx: TenantContext, resource: str, since: datetime | None
    ) -> list[dict[str, Any]]:
        tenant_id = ctx.tenant.id
        limit = 200

        if resource == "leads":
            query = select(Lead).where(Lead.tenant_id == tenant_id)
            if since:
                query = query.where(Lead.updated_at >= since)
            return [_serialize(r) for r in self.db.scalars(query.order_by(desc(Lead.updated_at)).limit(limit)).all()]
        if resource == "contacts":
            query = select(Contact).where(Contact.tenant_id == tenant_id)
            if since:
                query = query.where(Contact.updated_at >= since)
            return [_serialize(r) for r in self.db.scalars(query.order_by(desc(Contact.updated_at)).limit(limit)).all()]
        if resource == "companies":
            query = select(Company).where(Company.tenant_id == tenant_id)
            if since:
                query = query.where(Company.updated_at >= since)
            return [_serialize(r) for r in self.db.scalars(query.order_by(desc(Company.updated_at)).limit(limit)).all()]
        if resource == "deals":
            query = select(Deal).where(Deal.tenant_id == tenant_id)
            if since:
                query = query.where(Deal.updated_at >= since)
            return [_serialize(r) for r in self.db.scalars(query.order_by(desc(Deal.updated_at)).limit(limit)).all()]
        if resource == "tasks":
            query = select(Task).where(Task.tenant_id == tenant_id)
            if since:
                query = query.where(Task.updated_at >= since)
            return [_serialize(r) for r in self.db.scalars(query.order_by(desc(Task.updated_at)).limit(limit)).all()]
        if resource in ("calendar", "meetings"):
            query = select(Meeting).where(Meeting.tenant_id == tenant_id)
            if since:
                query = query.where(Meeting.updated_at >= since)
            return [_serialize(r) for r in self.db.scalars(query.order_by(desc(Meeting.updated_at)).limit(limit)).all()]
        if resource == "activities":
            query = select(Activity).where(Activity.tenant_id == tenant_id)
            if since:
                query = query.where(Activity.updated_at >= since)
            return [_serialize(r) for r in self.db.scalars(query.order_by(desc(Activity.updated_at)).limit(limit)).all()]
        if resource == "notifications":
            query = select(Notification).where(
                Notification.tenant_id == tenant_id,
                Notification.user_id == ctx.membership.user_id,
            )
            if since:
                query = query.where(Notification.created_at >= since)
            return [_serialize(r) for r in self.db.scalars(query.order_by(desc(Notification.created_at)).limit(limit)).all()]
        if resource == "dashboard":
            from app.repositories.dashboard_repository import DashboardRepository

            repo = DashboardRepository(self.db)
            summary = {
                "tasks": repo.get_task_summary(tenant_id, ctx.membership.user_id).__dict__,
                "activities": [_serialize(a) for a in repo.get_recent_activities(tenant_id, limit=10)],
            }
            return [summary]
        return []

    def sync_now(self, ctx: TenantContext, payload: SyncResourceRequest) -> SyncDataResponse:
        settings = self._get_or_create_settings(ctx)
        resources = payload.resources or list(settings.cache_resources or CACHEABLE_RESOURCES)
        resources = [r for r in resources if r in CACHEABLE_RESOURCES]

        session = SyncSession(
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            direction=payload.direction,
            status="running",
            resources=resources,
            started_at=utcnow(),
        )
        self.db.add(session)
        self.db.flush()

        upload_result = self.process_offline_queue(ctx)
        data: dict[str, list[dict[str, Any]]] = {}
        downloaded = 0
        for resource in resources:
            rows = self._fetch_resource_data(ctx, resource, payload.since)
            data[resource] = rows
            downloaded += len(rows)

        open_conflicts = list(
            self.db.scalars(
                select(SyncConflict).where(
                    SyncConflict.tenant_id == ctx.tenant.id,
                    SyncConflict.user_id == ctx.membership.user_id,
                    SyncConflict.status == "open",
                )
                .order_by(desc(SyncConflict.created_at))
                .limit(50)
            ).all()
        )

        session.items_uploaded = upload_result.get("completed", 0)
        session.items_downloaded = downloaded
        session.conflicts_found = len(open_conflicts)
        session.status = "completed" if upload_result.get("failed", 0) == 0 else "partial"
        session.completed_at = utcnow()
        settings.last_sync_at = utcnow()
        self.db.commit()
        self.db.refresh(session)

        return SyncDataResponse(
            session=SyncSessionResponse.model_validate(session),
            data=data,
            conflicts=[SyncConflictResponse.model_validate(c) for c in open_conflicts],
            server_time=datetime.now(timezone.utc),
        )

    def list_sync_history(self, ctx: TenantContext) -> list[SyncSessionResponse]:
        rows = self.db.scalars(
            select(SyncSession)
            .where(SyncSession.tenant_id == ctx.tenant.id, SyncSession.user_id == ctx.membership.user_id)
            .order_by(desc(SyncSession.created_at))
            .limit(50)
        ).all()
        return [SyncSessionResponse.model_validate(r) for r in rows]

    def list_conflicts(self, ctx: TenantContext) -> list[SyncConflictResponse]:
        rows = self.db.scalars(
            select(SyncConflict)
            .where(
                SyncConflict.tenant_id == ctx.tenant.id,
                SyncConflict.user_id == ctx.membership.user_id,
                SyncConflict.status == "open",
            )
            .order_by(desc(SyncConflict.created_at))
        ).all()
        return [SyncConflictResponse.model_validate(r) for r in rows]

    def resolve_conflict(
        self, ctx: TenantContext, conflict_id: uuid.UUID, payload: ConflictResolveRequest
    ) -> SyncConflictResponse:
        conflict = self.db.scalar(
            select(SyncConflict).where(
                SyncConflict.id == conflict_id,
                SyncConflict.tenant_id == ctx.tenant.id,
                SyncConflict.user_id == ctx.membership.user_id,
            )
        )
        if not conflict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")
        conflict.status = "resolved"
        conflict.resolution = payload.resolution
        conflict.resolved_by_id = ctx.membership.user_id
        conflict.resolved_at = utcnow()
        if payload.resolution == "client_wins" and payload.merged_data:
            conflict.server_version = payload.merged_data
        elif payload.resolution == "merged" and payload.merged_data:
            conflict.server_version = {**conflict.server_version, **payload.merged_data}
        self.db.commit()
        self.db.refresh(conflict)
        return SyncConflictResponse.model_validate(conflict)

    def subscribe_push(self, ctx: TenantContext, payload: PushSubscriptionCreate) -> PushSubscriptionResponse:
        existing = self.db.scalar(
            select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
        )
        if existing:
            existing.status = "active"
            existing.p256dh_key = payload.keys.get("p256dh", "")
            existing.auth_key = payload.keys.get("auth", "")
            existing.preferences = payload.preferences
            existing.last_used_at = utcnow()
            self.db.commit()
            self.db.refresh(existing)
            return PushSubscriptionResponse.model_validate(existing)

        sub = PushSubscription(
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            endpoint=payload.endpoint,
            p256dh_key=payload.keys.get("p256dh", ""),
            auth_key=payload.keys.get("auth", ""),
            user_agent=payload.user_agent,
            preferences=payload.preferences,
            last_used_at=utcnow(),
        )
        self.db.add(sub)
        self.db.commit()
        self.db.refresh(sub)
        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            type="push_enabled",
            title="Push notifications enabled",
            message="You will receive mobile push notifications for CRM events.",
            actor_id=ctx.membership.user_id,
        )
        return PushSubscriptionResponse.model_validate(sub)

    def unsubscribe_push(self, ctx: TenantContext, subscription_id: uuid.UUID) -> None:
        sub = self.db.scalar(
            select(PushSubscription).where(
                PushSubscription.id == subscription_id,
                PushSubscription.tenant_id == ctx.tenant.id,
                PushSubscription.user_id == ctx.membership.user_id,
            )
        )
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        sub.status = "revoked"
        self.db.commit()

    def list_push_subscriptions(self, ctx: TenantContext) -> list[PushSubscriptionResponse]:
        rows = self.db.scalars(
            select(PushSubscription).where(
                PushSubscription.tenant_id == ctx.tenant.id,
                PushSubscription.user_id == ctx.membership.user_id,
                PushSubscription.status == "active",
            )
        ).all()
        return [PushSubscriptionResponse.model_validate(r) for r in rows]
