import math
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func, nulls_last, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Contact, Deal, Lead, Task, TenantMembership, User
from app.models.task import KANBAN_STATUSES, TASK_ENTITY_TYPES, TASK_PRIORITIES, TASK_SORT_FIELDS, TASK_STATUSES
from app.schemas.task import TaskCreate, TaskDashboardSummary, TaskUpdate


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self, tenant_id: uuid.UUID):
        return (
            select(Task)
            .options(
                joinedload(Task.assigned_to),
                joinedload(Task.created_by),
            )
            .where(Task.tenant_id == tenant_id)
        )

    def _validate_assignee(self, tenant_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
        if user_id is None:
            return
        membership = self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == tenant_id,
                TenantMembership.user_id == user_id,
                TenantMembership.status == "active",
            )
        )
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user is not an active member of this organization",
            )

    def _validate_entity(
        self,
        tenant_id: uuid.UUID,
        entity_type: str | None,
        entity_id: uuid.UUID | None,
    ) -> None:
        if entity_type is None and entity_id is None:
            return
        if entity_type is None or entity_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both entity_type and entity_id are required when linking a task",
            )
        if entity_type not in TASK_ENTITY_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"entity_type must be one of: {', '.join(TASK_ENTITY_TYPES)}",
            )
        if entity_type == "lead":
            exists = self.db.scalar(
                select(Lead.id).where(Lead.id == entity_id, Lead.tenant_id == tenant_id)
            )
        elif entity_type == "contact":
            exists = self.db.scalar(
                select(Contact.id).where(Contact.id == entity_id, Contact.tenant_id == tenant_id)
            )
        else:
            exists = self.db.scalar(
                select(Deal.id).where(Deal.id == entity_id, Deal.tenant_id == tenant_id)
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
        status: str | None = None,
        priority: str | None = None,
        assigned_to_id: uuid.UUID | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        due_before: date | None = None,
        due_after: date | None = None,
        due_today: bool = False,
        overdue: bool = False,
        open_only: bool = False,
    ):
        if q:
            term = f"%{q.strip()}%"
            query = query.where(
                or_(Task.title.ilike(term), Task.description.ilike(term))
            )

        if status:
            normalized = status.strip().lower()
            if normalized not in TASK_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"status must be one of: {', '.join(TASK_STATUSES)}",
                )
            query = query.where(Task.status == normalized)

        if priority:
            normalized = priority.strip().lower()
            if normalized not in TASK_PRIORITIES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"priority must be one of: {', '.join(TASK_PRIORITIES)}",
                )
            query = query.where(Task.priority == normalized)

        if assigned_to_id:
            query = query.where(Task.assigned_to_id == assigned_to_id)

        if entity_type:
            normalized = entity_type.strip().lower()
            if normalized not in TASK_ENTITY_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"entity_type must be one of: {', '.join(TASK_ENTITY_TYPES)}",
                )
            query = query.where(Task.entity_type == normalized)

        if entity_id:
            query = query.where(Task.entity_id == entity_id)

        if due_before:
            query = query.where(Task.due_date <= due_before)

        if due_after:
            query = query.where(Task.due_date >= due_after)

        today = date.today()
        if due_today:
            query = query.where(Task.due_date == today)

        if overdue:
            query = query.where(
                Task.due_date < today,
                Task.status.in_(("pending", "in_progress")),
            )

        if open_only:
            query = query.where(Task.status.in_(("pending", "in_progress")))

        return query

    def list_tasks(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        assigned_to_id: uuid.UUID | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        due_before: date | None = None,
        due_after: date | None = None,
        due_today: bool = False,
        overdue: bool = False,
        open_only: bool = False,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "due_date",
        sort_order: str = "asc",
    ) -> tuple[list[Task], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        sort_field = sort_by if sort_by in TASK_SORT_FIELDS else "due_date"
        order_fn = desc if sort_order.lower() == "desc" else asc

        query = self._base_query(tenant_id)
        query = self._apply_filters(
            query,
            q=q,
            status=status,
            priority=priority,
            assigned_to_id=assigned_to_id,
            entity_type=entity_type,
            entity_id=entity_id,
            due_before=due_before,
            due_after=due_after,
            due_today=due_today,
            overdue=overdue,
            open_only=open_only,
        )

        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.scalar(count_query) or 0

        sort_column = getattr(Task, sort_field)
        tasks = list(
            self.db.scalars(
                query.order_by(nulls_last(order_fn(sort_column)))
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).all()
        )
        return tasks, total

    def get_task_board(self, tenant_id: uuid.UUID, assigned_to_id: uuid.UUID | None = None) -> list[Task]:
        query = self._base_query(tenant_id).where(Task.status.in_(KANBAN_STATUSES))
        if assigned_to_id:
            query = query.where(Task.assigned_to_id == assigned_to_id)
        return list(
            self.db.scalars(
                query.order_by(nulls_last(Task.due_date.asc()), Task.created_at.desc())
            ).all()
        )

    def get_task(self, tenant_id: uuid.UUID, task_id: uuid.UUID) -> Task:
        task = self.db.scalar(self._base_query(tenant_id).where(Task.id == task_id))
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return task

    def create_task(
        self,
        tenant_id: uuid.UUID,
        payload: TaskCreate,
        created_by_id: uuid.UUID,
    ) -> Task:
        self._validate_assignee(tenant_id, payload.assigned_to_id)
        self._validate_entity(tenant_id, payload.entity_type, payload.entity_id)

        task = Task(
            tenant_id=tenant_id,
            title=payload.title,
            description=payload.description,
            status=payload.status,
            priority=payload.priority,
            due_date=payload.due_date,
            assigned_to_id=payload.assigned_to_id,
            created_by_id=created_by_id,
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
        )
        self.db.add(task)
        self.db.commit()
        return self.get_task(tenant_id, task.id)

    def update_task(
        self,
        tenant_id: uuid.UUID,
        task_id: uuid.UUID,
        payload: TaskUpdate,
    ) -> Task:
        task = self.get_task(tenant_id, task_id)
        self._validate_assignee(tenant_id, payload.assigned_to_id)
        self._validate_entity(tenant_id, payload.entity_type, payload.entity_id)

        task.title = payload.title
        task.description = payload.description
        task.status = payload.status
        task.priority = payload.priority
        task.due_date = payload.due_date
        task.assigned_to_id = payload.assigned_to_id
        task.entity_type = payload.entity_type
        task.entity_id = payload.entity_id

        self.db.commit()
        return self.get_task(tenant_id, task_id)

    def delete_task(self, tenant_id: uuid.UUID, task_id: uuid.UUID) -> None:
        task = self.get_task(tenant_id, task_id)
        self.db.delete(task)
        self.db.commit()

    def get_dashboard_summary(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> TaskDashboardSummary:
        from app.repositories.dashboard_repository import DashboardRepository

        return DashboardRepository(self.db).get_task_summary(tenant_id, user_id)


def paginate(total: int, page: int, page_size: int) -> dict:
    pages = math.ceil(total / page_size) if total > 0 else 0
    return {"total": total, "page": page, "page_size": page_size, "pages": pages}
