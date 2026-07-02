from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.models.workflow import (
    CONDITION_OPERATORS,
    EXECUTION_STATUSES,
    WORKFLOW_ACTIONS,
    WORKFLOW_STATUSES,
    WORKFLOW_TRIGGERS,
)
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowDuplicateRequest,
    WorkflowExecuteRequest,
    WorkflowExecutionListResponse,
    WorkflowExecutionResponse,
    WorkflowListResponse,
    WorkflowLogResponse,
    WorkflowMetaResponse,
    WorkflowResponse,
    WorkflowUpdate,
    WorkflowVersionResponse,
)
from app.services.workflow_service import WorkflowService
from app.services.workflow_templates import WORKFLOW_TEMPLATES

router = APIRouter(prefix="/tenants/{slug}/workflows", tags=["workflows"])


def _to_response(workflow) -> WorkflowResponse:
    return WorkflowResponse.model_validate(workflow)


def _execution_response(row: tuple, workflow_name: str | None = None) -> WorkflowExecutionResponse:
    execution = row[0] if isinstance(row, tuple) else row
    name = row[1] if isinstance(row, tuple) and len(row) > 1 else workflow_name
    data = WorkflowExecutionResponse.model_validate(execution).model_dump()
    data["workflow_name"] = name
    return WorkflowExecutionResponse(**data)


@router.get("/meta", response_model=WorkflowMetaResponse)
def workflow_meta(
    _: TenantContext = Depends(require_permission("workflow:read")),
) -> WorkflowMetaResponse:
    return WorkflowMetaResponse(
        triggers=list(WORKFLOW_TRIGGERS),
        actions=list(WORKFLOW_ACTIONS),
        conditions=list(CONDITION_OPERATORS),
        statuses=list(WORKFLOW_STATUSES),
        execution_statuses=list(EXECUTION_STATUSES),
    )


@router.get("/template-library")
def template_library(
    _: TenantContext = Depends(require_permission("workflow:read")),
) -> list[dict]:
    return WORKFLOW_TEMPLATES


@router.get("/executions", response_model=WorkflowExecutionListResponse)
def list_all_executions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("workflow:read")),
    db: Session = Depends(get_db),
) -> WorkflowExecutionListResponse:
    rows, total = WorkflowService(db).list_executions(ctx.tenant.id, page=page, page_size=page_size)
    return WorkflowExecutionListResponse(
        items=[_execution_response(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/executions/{execution_id}", response_model=WorkflowExecutionResponse)
def get_execution(
    execution_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:read")),
    db: Session = Depends(get_db),
) -> WorkflowExecutionResponse:
    return WorkflowExecutionResponse.model_validate(
        WorkflowService(db).get_execution(ctx.tenant.id, execution_id)
    )


@router.get("/executions/{execution_id}/logs", response_model=list[WorkflowLogResponse])
def get_execution_logs(
    execution_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:read")),
    db: Session = Depends(get_db),
) -> list[WorkflowLogResponse]:
    logs = WorkflowService(db).list_logs(ctx.tenant.id, execution_id)
    return [WorkflowLogResponse.model_validate(log) for log in logs]


@router.post("/executions/{execution_id}/retry", response_model=WorkflowExecutionResponse)
def retry_execution(
    execution_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowExecutionResponse:
    execution = WorkflowService(db).retry_execution(
        ctx.tenant.id, execution_id, ctx.membership.user_id
    )
    return WorkflowExecutionResponse.model_validate(execution)


@router.get("", response_model=WorkflowListResponse)
def list_workflows(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("workflow:read")),
    db: Session = Depends(get_db),
) -> WorkflowListResponse:
    items, total = WorkflowService(db).list_workflows(
        ctx.tenant.id, q=q, status_filter=status, page=page, page_size=page_size
    )
    return WorkflowListResponse(
        items=[_to_response(w) for w in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=WorkflowResponse, status_code=201)
def create_workflow(
    payload: WorkflowCreate,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    workflow = WorkflowService(db).create_workflow(ctx.tenant.id, payload, ctx.membership.user_id)
    return _to_response(workflow)


@router.post("/from-template/{template_slug}", response_model=WorkflowResponse, status_code=201)
def create_from_template(
    template_slug: str,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    workflow = WorkflowService(db).create_from_template(
        ctx.tenant.id, template_slug, ctx.membership.user_id
    )
    return _to_response(workflow)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(
    workflow_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:read")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    return _to_response(WorkflowService(db).get_workflow(ctx.tenant.id, workflow_id))


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
def update_workflow(
    workflow_id: UUID,
    payload: WorkflowUpdate,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    workflow = WorkflowService(db).update_workflow(
        ctx.tenant.id, workflow_id, payload, ctx.membership.user_id
    )
    return _to_response(workflow)


@router.delete("/{workflow_id}", status_code=204)
def delete_workflow(
    workflow_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:delete")),
    db: Session = Depends(get_db),
) -> None:
    WorkflowService(db).delete_workflow(ctx.tenant.id, workflow_id)


@router.post("/{workflow_id}/duplicate", response_model=WorkflowResponse, status_code=201)
def duplicate_workflow(
    workflow_id: UUID,
    payload: WorkflowDuplicateRequest | None = None,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    workflow = WorkflowService(db).duplicate_workflow(
        ctx.tenant.id,
        workflow_id,
        ctx.membership.user_id,
        name=payload.name if payload else None,
    )
    return _to_response(workflow)


@router.post("/{workflow_id}/publish", response_model=WorkflowResponse)
def publish_workflow(
    workflow_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    workflow = WorkflowService(db).publish_workflow(
        ctx.tenant.id, workflow_id, ctx.membership.user_id
    )
    return _to_response(workflow)


@router.post("/{workflow_id}/pause", response_model=WorkflowResponse)
def pause_workflow(
    workflow_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    return _to_response(
        WorkflowService(db).pause_workflow(ctx.tenant.id, workflow_id, ctx.membership.user_id)
    )


@router.post("/{workflow_id}/resume", response_model=WorkflowResponse)
def resume_workflow(
    workflow_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    return _to_response(
        WorkflowService(db).resume_workflow(ctx.tenant.id, workflow_id, ctx.membership.user_id)
    )


@router.post("/{workflow_id}/disable", response_model=WorkflowResponse)
def disable_workflow(
    workflow_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    return _to_response(
        WorkflowService(db).disable_workflow(ctx.tenant.id, workflow_id, ctx.membership.user_id)
    )


@router.get("/{workflow_id}/versions", response_model=list[WorkflowVersionResponse])
def list_versions(
    workflow_id: UUID,
    ctx: TenantContext = Depends(require_permission("workflow:read")),
    db: Session = Depends(get_db),
) -> list[WorkflowVersionResponse]:
    versions = WorkflowService(db).list_versions(ctx.tenant.id, workflow_id)
    return [WorkflowVersionResponse.model_validate(v) for v in versions]


@router.post("/{workflow_id}/execute", response_model=WorkflowExecutionResponse, status_code=201)
def execute_workflow(
    workflow_id: UUID,
    payload: WorkflowExecuteRequest,
    ctx: TenantContext = Depends(require_permission("workflow:write")),
    db: Session = Depends(get_db),
) -> WorkflowExecutionResponse:
    execution = WorkflowService(db).queue_execution(
        ctx.tenant.id,
        workflow_id,
        trigger_type="manual",
        payload=payload.payload,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        actor_id=ctx.membership.user_id,
    )
    return WorkflowExecutionResponse.model_validate(execution)


@router.get("/{workflow_id}/executions", response_model=WorkflowExecutionListResponse)
def list_workflow_executions(
    workflow_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: TenantContext = Depends(require_permission("workflow:read")),
    db: Session = Depends(get_db),
) -> WorkflowExecutionListResponse:
    rows, total = WorkflowService(db).list_executions(
        ctx.tenant.id, workflow_id=workflow_id, page=page, page_size=page_size
    )
    return WorkflowExecutionListResponse(
        items=[_execution_response(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
