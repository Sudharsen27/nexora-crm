from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.models.task import KANBAN_STATUSES
from app.schemas.task import (
    TaskBoardResponse,
    TaskCreate,
    TaskDashboardSummary,
    TaskListResponse,
    TaskResponse,
    TaskStatusColumn,
    TaskUpdate,
)
from app.services.task_service import TaskService, paginate

router = APIRouter(prefix="/tenants/{slug}/tasks", tags=["tasks"])

STATUS_LABELS = {
    "pending": "Pending",
    "in_progress": "In Progress",
    "completed": "Completed",
    "cancelled": "Cancelled",
}


def _to_response(task) -> TaskResponse:
    assigned = None
    if task.assigned_to:
        assigned = {
            "id": task.assigned_to.id,
            "full_name": task.assigned_to.full_name,
            "email": task.assigned_to.email,
        }
    creator = None
    if task.created_by:
        creator = {
            "id": task.created_by.id,
            "full_name": task.created_by.full_name,
            "email": task.created_by.email,
        }
    return TaskResponse(
        id=task.id,
        tenant_id=task.tenant_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        assigned_to_id=task.assigned_to_id,
        assigned_to=assigned,
        created_by_id=task.created_by_id,
        created_by=creator,
        entity_type=task.entity_type,
        entity_id=task.entity_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("", response_model=TaskListResponse)
def list_tasks(
    q: str | None = Query(default=None, max_length=200),
    status: str | None = Query(default=None, max_length=30),
    priority: str | None = Query(default=None, max_length=20),
    assigned_to_id: UUID | None = Query(default=None),
    entity_type: str | None = Query(default=None, max_length=30),
    entity_id: UUID | None = Query(default=None),
    due_before: date | None = Query(default=None),
    due_after: date | None = Query(default=None),
    due_today: bool = Query(default=False),
    overdue: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="due_date"),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$"),
    ctx: TenantContext = Depends(require_permission("task:read")),
    db: Session = Depends(get_db),
) -> TaskListResponse:
    service = TaskService(db)
    tasks, total = service.list_tasks(
        ctx.tenant.id,
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
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    meta = paginate(total, page, page_size)
    return TaskListResponse(items=[_to_response(task) for task in tasks], **meta)


@router.get("/summary", response_model=TaskDashboardSummary)
def get_task_summary(
    ctx: TenantContext = Depends(require_permission("task:read")),
    db: Session = Depends(get_db),
) -> TaskDashboardSummary:
    return TaskService(db).get_dashboard_summary(ctx.tenant.id, ctx.membership.user_id)


@router.get("/board", response_model=TaskBoardResponse)
def get_task_board(
    assigned_to_id: UUID | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("task:read")),
    db: Session = Depends(get_db),
) -> TaskBoardResponse:
    tasks = TaskService(db).get_task_board(ctx.tenant.id, assigned_to_id)
    columns = []
    for slug in KANBAN_STATUSES:
        column_tasks = [task for task in tasks if task.status == slug]
        columns.append(
            TaskStatusColumn(
                slug=slug,
                label=STATUS_LABELS[slug],
                tasks=[_to_response(task) for task in column_tasks],
            )
        )
    return TaskBoardResponse(columns=columns, total=len(tasks))


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(
    payload: TaskCreate,
    ctx: TenantContext = Depends(require_permission("task:write")),
    db: Session = Depends(get_db),
) -> TaskResponse:
    task = TaskService(db).create_task(ctx.tenant.id, payload, ctx.membership.user_id)
    return _to_response(task)


@router.get("/my-tasks", response_model=TaskListResponse)
def list_my_tasks(
    q: str | None = Query(default=None, max_length=200),
    status: str | None = Query(default=None, max_length=30),
    priority: str | None = Query(default=None, max_length=20),
    due_today: bool = Query(default=False),
    overdue: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("task:read")),
    db: Session = Depends(get_db),
) -> TaskListResponse:
    service = TaskService(db)
    tasks, total = service.list_tasks(
        ctx.tenant.id,
        q=q,
        status=status,
        priority=priority,
        assigned_to_id=ctx.membership.user_id,
        due_today=due_today,
        overdue=overdue,
        page=page,
        page_size=page_size,
        sort_by="due_date",
        sort_order="asc",
    )
    meta = paginate(total, page, page_size)
    return TaskListResponse(items=[_to_response(task) for task in tasks], **meta)


@router.get("/assigned/{user_id}", response_model=TaskListResponse)
def list_assigned_tasks(
    user_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    status: str | None = Query(default=None, max_length=30),
    priority: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("task:read")),
    db: Session = Depends(get_db),
) -> TaskListResponse:
    service = TaskService(db)
    tasks, total = service.list_tasks(
        ctx.tenant.id,
        q=q,
        status=status,
        priority=priority,
        assigned_to_id=user_id,
        page=page,
        page_size=page_size,
        sort_by="due_date",
        sort_order="asc",
    )
    meta = paginate(total, page, page_size)
    return TaskListResponse(items=[_to_response(task) for task in tasks], **meta)


@router.get("/entity/{entity_type}/{entity_id}", response_model=TaskListResponse)
def list_entity_tasks(
    entity_type: str,
    entity_id: UUID,
    q: str | None = Query(default=None, max_length=200),
    status: str | None = Query(default=None, max_length=30),
    priority: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("task:read")),
    db: Session = Depends(get_db),
) -> TaskListResponse:
    service = TaskService(db)
    tasks, total = service.list_tasks(
        ctx.tenant.id,
        q=q,
        status=status,
        priority=priority,
        entity_type=entity_type,
        entity_id=entity_id,
        page=page,
        page_size=page_size,
        sort_by="due_date",
        sort_order="asc",
    )
    meta = paginate(total, page, page_size)
    return TaskListResponse(items=[_to_response(task) for task in tasks], **meta)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    ctx: TenantContext = Depends(require_permission("task:read")),
    db: Session = Depends(get_db),
) -> TaskResponse:
    task = TaskService(db).get_task(ctx.tenant.id, task_id)
    return _to_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    ctx: TenantContext = Depends(require_permission("task:write")),
    db: Session = Depends(get_db),
) -> TaskResponse:
    task = TaskService(db).update_task(ctx.tenant.id, task_id, payload, ctx.membership.user_id)
    return _to_response(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: UUID,
    ctx: TenantContext = Depends(require_permission("task:delete")),
    db: Session = Depends(get_db),
) -> None:
    TaskService(db).delete_task(ctx.tenant.id, task_id, ctx.membership.user_id)
