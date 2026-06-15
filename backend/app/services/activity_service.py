import math
import uuid

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Activity, Contact, Deal, Lead
from app.models.activity import ACTIVITY_TYPES, ENTITY_TYPES
from app.schemas.activity import ActivityCreate


class ActivityService:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self, tenant_id: uuid.UUID):
        return (
            select(Activity)
            .options(joinedload(Activity.created_by))
            .where(Activity.tenant_id == tenant_id)
        )

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

    def list_activities(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        activity_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Activity], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)

        query = self._base_query(tenant_id)

        if q:
            term = f"%{q.strip()}%"
            query = query.where(Activity.description.ilike(term))

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

        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.scalar(count_query) or 0

        activities = list(
            self.db.scalars(
                query.order_by(desc(Activity.created_at))
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return activities, total

    def get_activity(self, tenant_id: uuid.UUID, activity_id: uuid.UUID) -> Activity:
        activity = self.db.scalar(
            self._base_query(tenant_id).where(Activity.id == activity_id)
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

        activity = Activity(
            tenant_id=tenant_id,
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            activity_type=payload.activity_type,
            description=payload.description,
            activity_metadata=payload.metadata,
            created_by_id=created_by_id,
        )
        self.db.add(activity)
        self.db.commit()
        return self.get_activity(tenant_id, activity.id)

    def delete_activity(self, tenant_id: uuid.UUID, activity_id: uuid.UUID) -> None:
        activity = self.get_activity(tenant_id, activity_id)
        self.db.delete(activity)
        self.db.commit()


def paginate(total: int, page: int, page_size: int) -> dict:
    pages = math.ceil(total / page_size) if total > 0 else 0
    return {"total": total, "page": page, "page_size": page_size, "pages": pages}
