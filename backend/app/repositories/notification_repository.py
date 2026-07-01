"""Notification persistence and queries."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.notification import NOTIFICATION_CATEGORIES, Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, tenant_id: uuid.UUID, user_id: uuid.UUID, notification_id: uuid.UUID) -> Notification | None:
        return self.db.scalar(
            select(Notification)
            .options(joinedload(Notification.actor))
            .where(
                Notification.id == notification_id,
                Notification.tenant_id == tenant_id,
                Notification.user_id == user_id,
            )
        )

    def exists_dedup(self, tenant_id: uuid.UUID, user_id: uuid.UUID, dedup_key: str) -> bool:
        return bool(
            self.db.scalar(
                select(func.count())
                .select_from(Notification)
                .where(
                    Notification.tenant_id == tenant_id,
                    Notification.user_id == user_id,
                    Notification.dedup_key == dedup_key,
                )
            )
        )

    def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.flush()
        return notification

    def unread_count(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count())
                .select_from(Notification)
                .where(
                    Notification.tenant_id == tenant_id,
                    Notification.user_id == user_id,
                    Notification.read.is_(False),
                    Notification.archived_at.is_(None),
                )
            )
            or 0
        )

    def list_notifications(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        q: str | None = None,
        category: str | None = None,
        unread_only: bool = False,
        cursor: str | None = None,
        page_size: int = 20,
    ) -> tuple[list[Notification], int, str | None, bool]:
        base = [
            Notification.tenant_id == tenant_id,
            Notification.user_id == user_id,
            Notification.archived_at.is_(None),
        ]
        if unread_only:
            base.append(Notification.read.is_(False))
        if q:
            pattern = f"%{q}%"
            base.append(or_(Notification.title.ilike(pattern), Notification.message.ilike(pattern)))
        if category and category != "all":
            types = NOTIFICATION_CATEGORIES.get(category, ())
            if types:
                base.append(Notification.type.in_(types))

        total = int(self.db.scalar(select(func.count()).select_from(Notification).where(*base)) or 0)

        query = (
            select(Notification)
            .options(joinedload(Notification.actor))
            .where(*base)
            .order_by(desc(Notification.created_at), desc(Notification.id))
            .limit(page_size + 1)
        )
        if cursor:
            try:
                cursor_dt = datetime.fromisoformat(cursor.replace("Z", "+00:00"))
                query = query.where(Notification.created_at < cursor_dt)
            except ValueError:
                pass

        rows = list(self.db.scalars(query).all())
        has_more = len(rows) > page_size
        items = rows[:page_size]
        next_cursor = items[-1].created_at.isoformat() if has_more and items else None
        return items, total, next_cursor, has_more

    def mark_read(self, tenant_id: uuid.UUID, user_id: uuid.UUID, ids: list[uuid.UUID]) -> int:
        now = datetime.now(UTC)
        rows = list(
            self.db.scalars(
                select(Notification).where(
                    Notification.tenant_id == tenant_id,
                    Notification.user_id == user_id,
                    Notification.id.in_(ids),
                    Notification.read.is_(False),
                )
            ).all()
        )
        for row in rows:
            row.read = True
            row.read_at = now
        return len(rows)

    def mark_all_read(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> int:
        now = datetime.now(UTC)
        rows = list(
            self.db.scalars(
                select(Notification).where(
                    Notification.tenant_id == tenant_id,
                    Notification.user_id == user_id,
                    Notification.read.is_(False),
                    Notification.archived_at.is_(None),
                )
            ).all()
        )
        for row in rows:
            row.read = True
            row.read_at = now
        return len(rows)

    def archive(self, tenant_id: uuid.UUID, user_id: uuid.UUID, ids: list[uuid.UUID]) -> int:
        now = datetime.now(UTC)
        rows = list(
            self.db.scalars(
                select(Notification).where(
                    Notification.tenant_id == tenant_id,
                    Notification.user_id == user_id,
                    Notification.id.in_(ids),
                    Notification.archived_at.is_(None),
                )
            ).all()
        )
        for row in rows:
            row.archived_at = now
        return len(rows)

    def delete(self, tenant_id: uuid.UUID, user_id: uuid.UUID, ids: list[uuid.UUID]) -> int:
        rows = list(
            self.db.scalars(
                select(Notification).where(
                    Notification.tenant_id == tenant_id,
                    Notification.user_id == user_id,
                    Notification.id.in_(ids),
                )
            ).all()
        )
        for row in rows:
            self.db.delete(row)
        return len(rows)

    def get_due_tasks_tomorrow(self, tenant_id: uuid.UUID) -> list:
        from app.models import Task

        tomorrow = date.today() + timedelta(days=1)
        return list(
            self.db.scalars(
                select(Task).where(
                    Task.tenant_id == tenant_id,
                    Task.due_date == tomorrow,
                    Task.status.in_(("pending", "in_progress")),
                    Task.assigned_to_id.isnot(None),
                )
            ).all()
        )

    def get_upcoming_meetings(self, tenant_id: uuid.UUID, within_hours: int = 1) -> list:
        from app.models import Activity

        now = datetime.now(UTC)
        end = now + timedelta(hours=within_hours)
        return list(
            self.db.scalars(
                select(Activity).where(
                    Activity.tenant_id == tenant_id,
                    Activity.activity_type == "meeting",
                    Activity.scheduled_at.isnot(None),
                    Activity.scheduled_at >= now,
                    Activity.scheduled_at <= end,
                )
            ).all()
        )
