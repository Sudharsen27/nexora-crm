"""Workflow CRUD, publishing, and execution queueing."""

from __future__ import annotations

import math
import uuid
from copy import deepcopy

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db.mixins import utcnow
from app.models.workflow import (
    WORKFLOW_STATUSES,
    WORKFLOW_TRIGGERS,
    Workflow,
    WorkflowConnection,
    WorkflowExecution,
    WorkflowLog,
    WorkflowNode,
    WorkflowVersion,
)
from app.schemas.workflow import WorkflowCreate, WorkflowDefinitionInput, WorkflowUpdate
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_user
from app.services.workflow_engine import WorkflowEngine
from app.services.workflow_templates import WORKFLOW_TEMPLATES


class WorkflowService:
    def __init__(self, db: Session):
        self.db = db

    def _definition_dict(self, definition: WorkflowDefinitionInput | dict | None) -> dict:
        if definition is None:
            return {"nodes": [], "edges": []}
        if isinstance(definition, WorkflowDefinitionInput):
            return definition.model_dump()
        return definition

    def _sync_graph_tables(self, workflow: Workflow, version: int, definition: dict) -> None:
        self.db.query(WorkflowNode).filter(
            WorkflowNode.workflow_id == workflow.id,
            WorkflowNode.version == version,
        ).delete(synchronize_session=False)
        self.db.query(WorkflowConnection).filter(
            WorkflowConnection.workflow_id == workflow.id,
            WorkflowConnection.version == version,
        ).delete(synchronize_session=False)

        for node in definition.get("nodes") or []:
            data = node.get("data") or {}
            pos = node.get("position") or {}
            self.db.add(
                WorkflowNode(
                    workflow_id=workflow.id,
                    version=version,
                    node_key=node["id"],
                    node_type=node.get("type") or "action",
                    label=data.get("label") or node.get("type") or "",
                    config=data,
                    position_x=float(pos.get("x") or 0),
                    position_y=float(pos.get("y") or 0),
                )
            )

        for edge in definition.get("edges") or []:
            self.db.add(
                WorkflowConnection(
                    workflow_id=workflow.id,
                    version=version,
                    source_node_key=edge["source"],
                    target_node_key=edge["target"],
                    source_handle=edge.get("sourceHandle"),
                    target_handle=edge.get("targetHandle"),
                    condition_label=edge.get("label"),
                )
            )

    def list_workflows(
        self,
        tenant_id: uuid.UUID,
        *,
        q: str | None = None,
        status_filter: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Workflow], int]:
        query = select(Workflow).where(Workflow.tenant_id == tenant_id, Workflow.is_template.is_(False))
        if q:
            query = query.where(Workflow.name.ilike(f"%{q}%"))
        if status_filter:
            query = query.where(Workflow.status == status_filter)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = self.db.scalars(
            query.order_by(desc(Workflow.updated_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return list(items), total

    def get_workflow(self, tenant_id: uuid.UUID, workflow_id: uuid.UUID) -> Workflow:
        workflow = self.db.scalar(
            select(Workflow).where(Workflow.id == workflow_id, Workflow.tenant_id == tenant_id)
        )
        if workflow is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
        return workflow

    def create_workflow(
        self,
        tenant_id: uuid.UUID,
        payload: WorkflowCreate,
        user_id: uuid.UUID,
    ) -> Workflow:
        if payload.trigger_type not in WORKFLOW_TRIGGERS:
            raise HTTPException(status_code=400, detail="Invalid trigger type")
        definition = self._definition_dict(payload.definition)
        workflow = Workflow(
            tenant_id=tenant_id,
            name=payload.name.strip(),
            description=payload.description,
            trigger_type=payload.trigger_type,
            definition=definition,
            status="draft",
            is_template=payload.is_template,
            template_slug=payload.template_slug,
            created_by_id=user_id,
            updated_by_id=user_id,
        )
        self.db.add(workflow)
        self.db.flush()
        self._sync_graph_tables(workflow, workflow.version, definition)
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def update_workflow(
        self,
        tenant_id: uuid.UUID,
        workflow_id: uuid.UUID,
        payload: WorkflowUpdate,
        user_id: uuid.UUID,
    ) -> Workflow:
        workflow = self.get_workflow(tenant_id, workflow_id)
        if payload.name is not None:
            workflow.name = payload.name.strip()
        if payload.description is not None:
            workflow.description = payload.description
        if payload.trigger_type is not None:
            if payload.trigger_type not in WORKFLOW_TRIGGERS:
                raise HTTPException(status_code=400, detail="Invalid trigger type")
            workflow.trigger_type = payload.trigger_type
        if payload.definition is not None:
            definition = self._definition_dict(payload.definition)
            workflow.definition = definition
            self._sync_graph_tables(workflow, workflow.version, definition)
        if payload.status is not None:
            if payload.status not in WORKFLOW_STATUSES:
                raise HTTPException(status_code=400, detail="Invalid status")
            workflow.status = payload.status
        workflow.updated_by_id = user_id
        workflow.updated_at = utcnow()

        ActivityLogger(self.db).log(
            tenant_id=tenant_id,
            actor_id=user_id,
            entity_type="workflow",
            entity_id=workflow.id,
            action="workflow_updated",
            title="Workflow updated",
            description=f'Workflow "{workflow.name}" was updated.',
        )
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def delete_workflow(self, tenant_id: uuid.UUID, workflow_id: uuid.UUID) -> None:
        workflow = self.get_workflow(tenant_id, workflow_id)
        self.db.delete(workflow)
        self.db.commit()

    def duplicate_workflow(
        self,
        tenant_id: uuid.UUID,
        workflow_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        name: str | None = None,
    ) -> Workflow:
        source = self.get_workflow(tenant_id, workflow_id)
        copy = Workflow(
            tenant_id=tenant_id,
            name=name or f"{source.name} (copy)",
            description=source.description,
            trigger_type=source.trigger_type,
            definition=deepcopy(source.definition or {}),
            status="draft",
            created_by_id=user_id,
            updated_by_id=user_id,
        )
        self.db.add(copy)
        self.db.flush()
        self._sync_graph_tables(copy, copy.version, copy.definition or {})
        self.db.commit()
        self.db.refresh(copy)
        return copy

    def publish_workflow(self, tenant_id: uuid.UUID, workflow_id: uuid.UUID, user_id: uuid.UUID) -> Workflow:
        workflow = self.get_workflow(tenant_id, workflow_id)
        definition = workflow.definition or {}
        nodes = definition.get("nodes") or []
        if not any(n.get("type") == "trigger" for n in nodes):
            raise HTTPException(status_code=400, detail="Workflow must have a trigger node")

        workflow.version += 1
        workflow.published_version = workflow.version
        workflow.status = "published"
        workflow.published_at = utcnow()
        workflow.published_by_id = user_id
        workflow.updated_by_id = user_id

        snapshot = deepcopy(definition)
        self.db.add(
            WorkflowVersion(
                workflow_id=workflow.id,
                version=workflow.version,
                snapshot=snapshot,
                note="Published",
                created_by_id=user_id,
            )
        )
        self._sync_graph_tables(workflow, workflow.version, definition)

        notify_user(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            actor_id=user_id,
            type="workflow_success",
            title="Workflow published",
            message=f'"{workflow.name}" is now live.',
            entity_type="workflow",
            entity_id=workflow.id,
        )
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def pause_workflow(self, tenant_id: uuid.UUID, workflow_id: uuid.UUID, user_id: uuid.UUID) -> Workflow:
        workflow = self.get_workflow(tenant_id, workflow_id)
        workflow.status = "paused"
        workflow.updated_by_id = user_id
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def resume_workflow(self, tenant_id: uuid.UUID, workflow_id: uuid.UUID, user_id: uuid.UUID) -> Workflow:
        workflow = self.get_workflow(tenant_id, workflow_id)
        workflow.status = "published"
        workflow.updated_by_id = user_id
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def disable_workflow(self, tenant_id: uuid.UUID, workflow_id: uuid.UUID, user_id: uuid.UUID) -> Workflow:
        workflow = self.get_workflow(tenant_id, workflow_id)
        workflow.status = "disabled"
        workflow.updated_by_id = user_id
        notify_user(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            actor_id=user_id,
            type="workflow_failed",
            title="Workflow disabled",
            message=f'"{workflow.name}" was disabled.',
            entity_type="workflow",
            entity_id=workflow.id,
        )
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def list_versions(self, tenant_id: uuid.UUID, workflow_id: uuid.UUID) -> list[WorkflowVersion]:
        self.get_workflow(tenant_id, workflow_id)
        return list(
            self.db.scalars(
                select(WorkflowVersion)
                .where(WorkflowVersion.workflow_id == workflow_id)
                .order_by(desc(WorkflowVersion.version))
            ).all()
        )

    def queue_execution(
        self,
        tenant_id: uuid.UUID,
        workflow_id: uuid.UUID,
        *,
        trigger_type: str,
        payload: dict,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        actor_id: uuid.UUID | None = None,
        run_immediately: bool = True,
    ) -> WorkflowExecution:
        workflow = self.get_workflow(tenant_id, workflow_id)
        if workflow.status != "published":
            raise HTTPException(status_code=400, detail="Workflow is not published")

        execution = WorkflowExecution(
            workflow_id=workflow.id,
            tenant_id=tenant_id,
            version=workflow.published_version or workflow.version,
            trigger_type=trigger_type,
            trigger_payload=payload,
            status="queued",
            entity_type=entity_type,
            entity_id=entity_id,
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        if run_immediately:
            WorkflowEngine(self.db).run_execution(execution.id, actor_id=actor_id)
            self.db.refresh(execution)
        return execution

    def list_executions(
        self,
        tenant_id: uuid.UUID,
        *,
        workflow_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[tuple[WorkflowExecution, str | None]], int]:
        query = (
            select(WorkflowExecution, Workflow.name)
            .join(Workflow, Workflow.id == WorkflowExecution.workflow_id)
            .where(WorkflowExecution.tenant_id == tenant_id)
        )
        if workflow_id:
            query = query.where(WorkflowExecution.workflow_id == workflow_id)
        count_q = select(func.count()).select_from(
            select(WorkflowExecution.id)
            .where(WorkflowExecution.tenant_id == tenant_id)
            .subquery()
        )
        if workflow_id:
            count_q = select(func.count()).select_from(
                select(WorkflowExecution.id)
                .where(
                    WorkflowExecution.tenant_id == tenant_id,
                    WorkflowExecution.workflow_id == workflow_id,
                )
                .subquery()
            )
        total = self.db.scalar(count_q) or 0
        rows = self.db.execute(
            query.order_by(desc(WorkflowExecution.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [(row[0], row[1]) for row in rows], total

    def get_execution(self, tenant_id: uuid.UUID, execution_id: uuid.UUID) -> WorkflowExecution:
        execution = self.db.scalar(
            select(WorkflowExecution).where(
                WorkflowExecution.id == execution_id,
                WorkflowExecution.tenant_id == tenant_id,
            )
        )
        if execution is None:
            raise HTTPException(status_code=404, detail="Execution not found")
        return execution

    def list_logs(self, tenant_id: uuid.UUID, execution_id: uuid.UUID) -> list[WorkflowLog]:
        self.get_execution(tenant_id, execution_id)
        return list(
            self.db.scalars(
                select(WorkflowLog)
                .where(WorkflowLog.execution_id == execution_id)
                .order_by(WorkflowLog.created_at)
            ).all()
        )

    def retry_execution(
        self,
        tenant_id: uuid.UUID,
        execution_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> WorkflowExecution:
        old = self.get_execution(tenant_id, execution_id)
        if old.status not in ("failed", "cancelled"):
            raise HTTPException(status_code=400, detail="Only failed or cancelled executions can be retried")

        retry = WorkflowExecution(
            workflow_id=old.workflow_id,
            tenant_id=tenant_id,
            version=old.version,
            trigger_type=old.trigger_type,
            trigger_payload=old.trigger_payload,
            status="queued",
            entity_type=old.entity_type,
            entity_id=old.entity_id,
            retry_count=old.retry_count + 1,
        )
        self.db.add(retry)
        self.db.commit()
        self.db.refresh(retry)
        WorkflowEngine(self.db).run_execution(retry.id, actor_id=actor_id)
        self.db.refresh(retry)
        return retry

    def list_templates(self) -> list[dict]:
        return WORKFLOW_TEMPLATES

    def create_from_template(
        self,
        tenant_id: uuid.UUID,
        template_slug: str,
        user_id: uuid.UUID,
    ) -> Workflow:
        template = next((t for t in WORKFLOW_TEMPLATES if t["template_slug"] == template_slug), None)
        if template is None:
            raise HTTPException(status_code=404, detail="Template not found")
        return self.create_workflow(
            tenant_id,
            WorkflowCreate(
                name=template["name"],
                description=template["description"],
                trigger_type=template["trigger_type"],
                definition=WorkflowDefinitionInput(**template["definition"]),
                template_slug=template_slug,
            ),
            user_id,
        )


def paginate(total: int, page: int, page_size: int) -> dict:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, math.ceil(total / page_size)) if page_size else 1,
    }
