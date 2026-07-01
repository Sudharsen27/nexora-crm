"""Shared helpers for emitting user-targeted notifications from domain services."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Tenant, TenantMembership
from app.services.notification_emitter import NotificationEmitter


def _tenant_slug(db: Session, tenant_id: uuid.UUID) -> str | None:
    return db.scalar(select(Tenant.slug).where(Tenant.id == tenant_id))


def notify_user(
    db: Session,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID | None,
    actor_id: uuid.UUID | None,
    type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    priority: str | None = None,
    dedup_key: str | None = None,
    metadata: dict | None = None,
) -> None:
    if not user_id:
        return
    slug = _tenant_slug(db, tenant_id)
    if not slug:
        return
    emitter = NotificationEmitter(db)
    emitter.notify(
        tenant_id=tenant_id,
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        priority=priority,
        action_url=emitter.build_action_url(slug, entity_type, entity_id),
        dedup_key=dedup_key,
        metadata=metadata,
        tenant_slug=slug,
    )


def notify_deal_event(
    db: Session,
    *,
    tenant_id: uuid.UUID,
    deal,
    action: str,
    title: str,
    message: str,
    actor_id: uuid.UUID | None,
) -> None:
    mapping = {
        "deal_created": "deal_created",
        "deal_won": "deal_won",
        "deal_lost": "deal_lost",
        "deal_stage_changed": "deal_stage_changed",
    }
    ntype = mapping.get(action)
    if not ntype:
        return
    notify_user(
        db,
        tenant_id=tenant_id,
        user_id=deal.assigned_to_id,
        actor_id=actor_id,
        type=ntype,
        title=title,
        message=message,
        entity_type="deal",
        entity_id=deal.id,
    )


def notify_all_members_except(
    db: Session,
    *,
    tenant_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> None:
    slug = _tenant_slug(db, tenant_id)
    if not slug:
        return
    members = db.scalars(
        select(TenantMembership.user_id).where(
            TenantMembership.tenant_id == tenant_id,
            TenantMembership.status == "active",
        )
    ).all()
    emitter = NotificationEmitter(db)
    for uid in members:
        if actor_id and uid == actor_id:
            continue
        emitter.notify(
            tenant_id=tenant_id,
            user_id=uid,
            actor_id=actor_id,
            type=type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=emitter.build_action_url(slug, entity_type, entity_id),
            tenant_slug=slug,
        )
