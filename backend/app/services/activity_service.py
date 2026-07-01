import math
import uuid
from datetime import date, datetime, time, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.mixins import utcnow
from app.models import Activity, Company, Contact, Deal, Lead, Task
from app.models.activity import ACTIVITY_TYPES, ENTITY_TYPES
from app.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.services.activity_logger import ACTION_META, ActivityLogger
from app.services.notification_hooks import notify_user


class ActivityService:
    def __init__(self, db: Session):
        self.db = db
        self._logger = ActivityLogger(db)
        self._repo = ActivityRepository(db)

    def _base_query(self, tenant_id: uuid.UUID, *, include_archived: bool = False):
        query = (
            select(Activity)
            .options(joinedload(Activity.created_by))
            .where(Activity.tenant_id == tenant_id)
        )
        if not include_archived:
            query = query.where(Activity.archived_at.is_(None))
        return query

    def _validate_entity(self, tenant_id: uuid.UUID, entity_type: str, entity_id: uuid.UUID) -> None:
        if entity_type == "lead":
            exists = self.db.scalar(
                select(Lead.id).where(Lead.id == entity_id, Lead.tenant_id == tenant_id)
            )
        elif entity_type == "contact":
            exists = self.db.scalar(
                select(Contact.id).where(Contact.id == entity_id, Contact.tenant_id == tenant_id)
            )
        elif entity_type == "deal":
            exists = self.db.scalar(
                select(Deal.id).where(Deal.id == entity_id, Deal.tenant_id == tenant_id)
            )
        elif entity_type == "company":
            exists = self.db.scalar(
                select(Company.id).where(Company.id == entity_id, Company.tenant_id == tenant_id)
            )
        elif entity_type == "task":
            exists = self.db.scalar(
                select(Task.id).where(Task.id == entity_id, Task.tenant_id == tenant_id)
            )
        elif entity_type in ("user", "tenant"):
            exists = entity_id  # system-level refs validated loosely
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"entity_type must be one of: {', '.join(ENTITY_TYPES)}",
            )

        if exists is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{entity_type.capitalize()} not found in this organization",
            )

    def _apply_filters(
        self,
        query,
        *,
        q: str | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        activity_type: str | None = None,
        action: str | None = None,
        actor_id: uuid.UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        category: str | None = None,
    ):
        if q:
            term = f"%{q.strip()}%"
            query = query.where(
                or_(
                    Activity.description.ilike(term),
                    Activity.title.ilike(term),
                )
            )

        if entity_type:
            normalized = entity_type.strip().lower()
            if normalized not in ENTITY_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"entity_type must be one of: {', '.join(ENTITY_TYPES)}",
                )
            query = query.where(Activity.entity_type == normalized)

        if entity_id:
            query = query.where(Activity.entity_id == entity_id)

        if activity_type:
            normalized = activity_type.strip().lower()
            if normalized not in ACTIVITY_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"activity_type must be one of: {', '.join(ACTIVITY_TYPES)}",
                )
            query = query.where(Activity.activity_type == normalized)

        if action:
            query = query.where(Activity.action == action.strip().lower())

        if actor_id:
            query = query.where(Activity.created_by_id == actor_id)

        if date_from:
            start = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
            query = query.where(Activity.created_at >= start)

        if date_to:
            end = datetime.combine(date_to, time.max, tzinfo=timezone.utc)
            query = query.where(Activity.created_at <= end)

        if category:
            cat = category.strip().lower()
            category_map = {
                "deals": ("deal",),
                "companies": ("company",),
                "contacts": ("contact",),
                "tasks": ("task",),
                "notes": ("note_added", "note_edited", "note"),
                "authentication": ("user_login", "user_invited", "password_reset"),
            }
            if cat in category_map:
                val = category_map[cat]
                if cat == "notes":
                    query = query.where(Activity.action.in_(val))
                elif cat == "authentication":
                    query = query.where(Activity.action.in_(val))
                else:
                    query = query.where(Activity.entity_type.in_(val))

        return query

    def list_activities(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        activity_type: str | None = None,
        action: str | None = None,
        actor_id: uuid.UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        category: str | None = None,
        page: int = 1,
        page_size: int = 20,
        cursor: str | None = None,
        sort: str = "desc",
    ) -> tuple[list[Activity], int, str | None, bool]:
        page_size = min(max(page_size, 1), 100)
        order = desc(Activity.created_at) if sort.lower() != "asc" else Activity.created_at.asc()

        query = self._base_query(tenant_id)
        query = self._apply_filters(
            query,
            q=q,
            entity_type=entity_type,
            entity_id=entity_id,
            activity_type=activity_type,
            action=action,
            actor_id=actor_id,
            date_from=date_from,
            date_to=date_to,
            category=category,
        )

        if cursor:
            try:
                cursor_dt = datetime.fromisoformat(cursor)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid cursor",
                ) from exc
            if sort.lower() == "asc":
                query = query.where(Activity.created_at > cursor_dt)
            else:
                query = query.where(Activity.created_at < cursor_dt)

        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.scalar(count_query) or 0

        if cursor:
            activities = list(
                self.db.scalars(query.order_by(order).limit(page_size + 1)).all()
            )
            has_more = len(activities) > page_size
            if has_more:
                activities = activities[:page_size]
            next_cursor = (
                activities[-1].created_at.isoformat() if has_more and activities else None
            )
            return activities, total, next_cursor, has_more

        page = max(page, 1)
        activities = list(
            self.db.scalars(
                query.order_by(order)
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return activities, total, None, False

    def get_activity(self, tenant_id: uuid.UUID, activity_id: uuid.UUID) -> Activity:
        activity = self.db.scalar(
            self._base_query(tenant_id, include_archived=True).where(Activity.id == activity_id)
        )
        if activity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        return activity

    def create_activity(
        self,
        tenant_id: uuid.UUID,
        payload: ActivityCreate,
        created_by_id: uuid.UUID,
    ) -> Activity:
        self._validate_entity(tenant_id, payload.entity_type, payload.entity_id)

        action = payload.action or payload.activity_type
        meta = ACTION_META.get(action, {})
        title = payload.title or meta.get("label", action.replace("_", " ").title())

        activity = self._logger.log(
            tenant_id=tenant_id,
            actor_id=created_by_id,
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            action=action,
            title=title,
            description=payload.description,
            metadata=payload.metadata,
            activity_type=payload.activity_type,
            scheduled_at=payload.scheduled_at,
        )
        if payload.activity_type == "meeting":
            notify_user(
                self.db,
                tenant_id=tenant_id,
                user_id=created_by_id,
                actor_id=created_by_id,
                type="meeting_scheduled",
                title="Meeting scheduled",
                message=payload.description,
                entity_type=payload.entity_type,
                entity_id=payload.entity_id,
            )
        self.db.commit()
        return self.get_activity(tenant_id, activity.id)

    def update_activity(
        self,
        tenant_id: uuid.UUID,
        activity_id: uuid.UUID,
        payload: ActivityUpdate,
    ) -> Activity:
        activity = self.get_activity(tenant_id, activity_id)
        data = payload.model_dump(exclude_unset=True)

        entity_type = data.get("entity_type", activity.entity_type)
        entity_id = data.get("entity_id", activity.entity_id)
        if "entity_type" in data or "entity_id" in data:
            self._validate_entity(tenant_id, entity_type, entity_id)

        if "metadata" in data:
            activity.activity_metadata = data["metadata"]

        for field in (
            "entity_type",
            "entity_id",
            "activity_type",
            "action",
            "title",
            "description",
            "scheduled_at",
        ):
            if field in data:
                setattr(activity, field, data[field])

        self.db.commit()
        return self.get_activity(tenant_id, activity_id)

    def delete_activity(self, tenant_id: uuid.UUID, activity_id: uuid.UUID) -> None:
        activity = self.get_activity(tenant_id, activity_id)
        self.db.delete(activity)
        self.db.commit()

    def bulk_delete(self, tenant_id: uuid.UUID, activity_ids: list[uuid.UUID]) -> int:
        rows = list(
            self.db.scalars(
                select(Activity).where(
                    Activity.tenant_id == tenant_id,
                    Activity.id.in_(activity_ids),
                )
            ).all()
        )
        for row in rows:
            self.db.delete(row)
        self.db.commit()
        return len(rows)

    def bulk_archive(self, tenant_id: uuid.UUID, activity_ids: list[uuid.UUID]) -> int:
        rows = list(
            self.db.scalars(
                select(Activity).where(
                    Activity.tenant_id == tenant_id,
                    Activity.id.in_(activity_ids),
                    Activity.archived_at.is_(None),
                )
            ).all()
        )
        now = utcnow()
        for row in rows:
            row.archived_at = now
        self.db.commit()
        return len(rows)

    def resolve_entities(
        self, tenant_id: uuid.UUID, tenant_slug: str, activities: list[Activity]
    ):
        return self._repo.resolve_entities(tenant_id, tenant_slug, activities)


def paginate(total: int, page: int, page_size: int) -> dict:
    pages = math.ceil(total / page_size) if total > 0 else 0
    return {"total": total, "page": page, "page_size": page_size, "pages": pages}
