"""Workflow execution engine — traverses graph and runs actions."""

from __future__ import annotations

import logging
import time
import uuid
from datetime import date, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.mixins import utcnow
from app.models import Deal, Lead, Workflow, WorkflowExecution, WorkflowLog
from app.schemas.task import TaskCreate
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_user
from app.services.task_service import TaskService

logger = logging.getLogger(__name__)
MAX_DELAY_SECONDS = 300


class WorkflowEngine:
    def __init__(self, db: Session):
        self.db = db

    def _log(
        self,
        execution: WorkflowExecution,
        message: str,
        *,
        level: str = "info",
        node_key: str | None = None,
        data: dict | None = None,
    ) -> None:
        self.db.add(
            WorkflowLog(
                execution_id=execution.id,
                workflow_id=execution.workflow_id,
                tenant_id=execution.tenant_id,
                level=level,
                message=message,
                node_key=node_key,
                data=data,
            )
        )

    def _get_context_value(self, context: dict[str, Any], field: str) -> Any:
        if field in context:
            return context[field]
        payload = context.get("payload") or {}
        if isinstance(payload, dict) and field in payload:
            return payload[field]
        entity = context.get("entity") or {}
        if isinstance(entity, dict) and field in entity:
            return entity[field]
        return None

    def _evaluate_rule(self, context: dict[str, Any], rule: dict) -> bool:
        field = rule.get("field", "")
        operator = rule.get("operator", "equals")
        expected = rule.get("value")
        actual = self._get_context_value(context, field)

        if operator == "equals":
            return str(actual) == str(expected)
        if operator == "contains":
            return str(expected).lower() in str(actual or "").lower()
        if operator == "greater_than":
            try:
                return float(actual) > float(expected)
            except (TypeError, ValueError):
                return False
        if operator == "less_than":
            try:
                return float(actual) < float(expected)
            except (TypeError, ValueError):
                return False
        if operator == "is_empty":
            return actual is None or actual == "" or actual == []
        if operator == "is_not_empty":
            return actual is not None and actual != "" and actual != []
        return False

    def _evaluate_condition(self, node_data: dict, context: dict[str, Any]) -> bool:
        rules = node_data.get("rules") or []
        logic = (node_data.get("logic") or "and").lower()
        if not rules:
            return True
        results = [self._evaluate_rule(context, rule) for rule in rules]
        return all(results) if logic == "and" else any(results)

    def _next_nodes(
        self,
        definition: dict,
        current_id: str,
        *,
        branch: str | None = None,
    ) -> list[str]:
        edges = definition.get("edges") or []
        targets: list[str] = []
        for edge in edges:
            if edge.get("source") != current_id:
                continue
            handle = edge.get("sourceHandle")
            if branch is None or handle is None or handle == branch:
                targets.append(edge["target"])
        return targets

    def _find_trigger_node(self, definition: dict) -> dict | None:
        for node in definition.get("nodes") or []:
            if node.get("type") == "trigger":
                return node
        return None

    def _execute_action(
        self,
        execution: WorkflowExecution,
        workflow: Workflow,
        node: dict,
        context: dict[str, Any],
        actor_id: uuid.UUID | None,
    ) -> None:
        data = node.get("data") or {}
        action_type = data.get("action_type")
        config = data.get("config") or {}
        tenant_id = execution.tenant_id
        payload = context.get("payload") or {}

        if action_type == "create_task":
            due_in_days = int(config.get("due_in_days") or 0)
            due_date = date.today() + timedelta(days=due_in_days) if due_in_days else None
            entity_type = payload.get("entity_type") or execution.entity_type
            entity_id = payload.get("entity_id") or execution.entity_id
            assignee = config.get("assigned_to_id") or payload.get("assigned_to_id") or actor_id
            creator = actor_id or workflow.created_by_id
            if creator is None:
                self._log(execution, "Skipped create_task: no creator user", level="warn", node_key=node["id"])
                return
            task = TaskService(self.db).create_task(
                tenant_id,
                TaskCreate(
                    title=config.get("title") or "Workflow task",
                    description=config.get("description"),
                    status="pending",
                    priority=config.get("priority") or "medium",
                    due_date=due_date,
                    entity_type=entity_type,
                    entity_id=uuid.UUID(str(entity_id)) if entity_id else None,
                    assigned_to_id=uuid.UUID(str(assignee)) if assignee else None,
                ),
                creator,
            )
            self._log(execution, f"Created task {task.id}", node_key=node["id"], data={"task_id": str(task.id)})

        elif action_type == "send_notification":
            user_id = config.get("user_id") or payload.get("assigned_to_id") or actor_id
            if user_id:
                notify_user(
                    self.db,
                    tenant_id=tenant_id,
                    user_id=uuid.UUID(str(user_id)),
                    actor_id=actor_id,
                    type="workflow_success",
                    title=config.get("title") or "Workflow notification",
                    message=config.get("message") or f"Workflow '{workflow.name}' ran successfully.",
                    priority=config.get("priority") or "normal",
                    entity_type=execution.entity_type,
                    entity_id=execution.entity_id,
                )
                self._log(execution, "Notification sent", node_key=node["id"])

        elif action_type == "create_activity":
            entity_type = payload.get("entity_type") or execution.entity_type or "company"
            entity_id = payload.get("entity_id") or execution.entity_id
            if entity_id:
                ActivityLogger(self.db).log(
                    tenant_id=tenant_id,
                    actor_id=actor_id,
                    entity_type=entity_type,
                    entity_id=uuid.UUID(str(entity_id)),
                    action="workflow_completed",
                    title=config.get("title") or "Workflow activity",
                    description=config.get("description") or "Automated workflow activity.",
                )
                self._log(execution, "Activity logged", node_key=node["id"])

        elif action_type == "update_deal_stage":
            deal_id = payload.get("deal_id") or execution.entity_id
            stage = config.get("stage")
            if deal_id and stage:
                deal = self.db.scalar(
                    select(Deal).where(Deal.id == uuid.UUID(str(deal_id)), Deal.tenant_id == tenant_id)
                )
                if deal:
                    deal.stage = stage
                    self._log(execution, f"Deal stage updated to {stage}", node_key=node["id"])

        elif action_type == "update_lead_status":
            lead_id = payload.get("lead_id") or execution.entity_id
            status = config.get("status")
            if lead_id and status:
                lead = self.db.scalar(
                    select(Lead).where(Lead.id == uuid.UUID(str(lead_id)), Lead.tenant_id == tenant_id)
                )
                if lead:
                    lead.status = status
                    self._log(execution, f"Lead status updated to {status}", node_key=node["id"])

        elif action_type == "assign_user":
            user_id = config.get("user_id")
            if execution.entity_type == "lead" and execution.entity_id and user_id:
                lead = self.db.scalar(
                    select(Lead).where(Lead.id == execution.entity_id, Lead.tenant_id == tenant_id)
                )
                if lead:
                    lead.assigned_to_id = uuid.UUID(str(user_id))
                    self._log(execution, "Lead assignee updated", node_key=node["id"])
            elif execution.entity_type == "deal" and execution.entity_id and user_id:
                deal = self.db.scalar(
                    select(Deal).where(Deal.id == execution.entity_id, Deal.tenant_id == tenant_id)
                )
                if deal:
                    deal.assigned_to_id = uuid.UUID(str(user_id))
                    self._log(execution, "Deal assignee updated", node_key=node["id"])

        elif action_type == "delay":
            seconds = min(int(config.get("seconds") or 0), MAX_DELAY_SECONDS)
            if seconds > 0:
                self._log(execution, f"Delaying {seconds}s", node_key=node["id"])
                self.db.flush()
                time.sleep(seconds)

        elif action_type == "call_webhook":
            url = config.get("url")
            if url:
                with httpx.Client(timeout=15.0) as client:
                    response = client.post(url, json={"workflow_id": str(workflow.id), "payload": payload})
                self._log(
                    execution,
                    f"Webhook called ({response.status_code})",
                    node_key=node["id"],
                    data={"status_code": response.status_code},
                )
        else:
            self._log(
                execution,
                f"Skipped unsupported action: {action_type}",
                level="warn",
                node_key=node["id"],
            )

    def _walk(
        self,
        execution: WorkflowExecution,
        workflow: Workflow,
        definition: dict,
        node_id: str,
        context: dict[str, Any],
        actor_id: uuid.UUID | None,
        visited: set[str],
    ) -> None:
        if node_id in visited:
            return
        visited.add(node_id)

        nodes_by_id = {n["id"]: n for n in definition.get("nodes") or []}
        node = nodes_by_id.get(node_id)
        if node is None:
            return

        node_type = node.get("type")
        if node_type == "end":
            return

        if node_type == "condition":
            passed = self._evaluate_condition(node.get("data") or {}, context)
            self._log(
                execution,
                f"Condition {'passed' if passed else 'failed'}",
                node_key=node_id,
                data={"passed": passed},
            )
            branch = "true" if passed else "false"
            for target in self._next_nodes(definition, node_id, branch=branch):
                self._walk(execution, workflow, definition, target, context, actor_id, visited)
            return

        if node_type == "action":
            self._execute_action(execution, workflow, node, context, actor_id)

        if node_type == "branch":
            branch = (node.get("data") or {}).get("branch") or "default"
            for target in self._next_nodes(definition, node_id, branch=branch):
                self._walk(execution, workflow, definition, target, context, actor_id, visited)
            return

        for target in self._next_nodes(definition, node_id):
            self._walk(execution, workflow, definition, target, context, actor_id, visited)

    def run_execution(self, execution_id: uuid.UUID, *, actor_id: uuid.UUID | None = None) -> WorkflowExecution:
        execution = self.db.scalar(
            select(WorkflowExecution).where(WorkflowExecution.id == execution_id)
        )
        if execution is None:
            raise ValueError("Execution not found")

        workflow = self.db.scalar(select(Workflow).where(Workflow.id == execution.workflow_id))
        if workflow is None:
            raise ValueError("Workflow not found")

        execution.status = "running"
        execution.started_at = utcnow()
        self._log(execution, f"Workflow '{workflow.name}' started", data={"trigger": execution.trigger_type})

        ActivityLogger(self.db).log(
            tenant_id=execution.tenant_id,
            actor_id=actor_id,
            entity_type=execution.entity_type or "workflow",
            entity_id=execution.entity_id or workflow.id,
            action="workflow_started",
            title="Workflow started",
            description=f"Workflow '{workflow.name}' execution started.",
            metadata={"workflow_id": str(workflow.id), "execution_id": str(execution.id)},
        )

        try:
            definition = workflow.definition or {}
            trigger = self._find_trigger_node(definition)
            if trigger is None:
                raise RuntimeError("Workflow has no trigger node")

            context = {
                "payload": execution.trigger_payload or {},
                "entity_type": execution.entity_type,
                "entity_id": str(execution.entity_id) if execution.entity_id else None,
            }
            for target in self._next_nodes(definition, trigger["id"]):
                self._walk(execution, workflow, definition, target, context, actor_id, set())

            execution.status = "completed"
            execution.completed_at = utcnow()
            self._log(execution, "Workflow completed successfully")

            ActivityLogger(self.db).log(
                tenant_id=execution.tenant_id,
                actor_id=actor_id,
                entity_type=execution.entity_type or "workflow",
                entity_id=execution.entity_id or workflow.id,
                action="workflow_completed",
                title="Workflow completed",
                description=f"Workflow '{workflow.name}' completed successfully.",
                metadata={"workflow_id": str(workflow.id), "execution_id": str(execution.id)},
            )

            notify_user(
                self.db,
                tenant_id=execution.tenant_id,
                user_id=actor_id or workflow.created_by_id,
                actor_id=actor_id,
                type="workflow_success",
                title="Workflow completed",
                message=f"'{workflow.name}' ran successfully.",
                priority="normal",
                entity_type="workflow",
                entity_id=workflow.id,
            )
        except Exception as exc:
            logger.exception("Workflow execution failed: %s", execution.id)
            execution.status = "failed"
            execution.error_message = str(exc)
            execution.completed_at = utcnow()
            self._log(execution, f"Workflow failed: {exc}", level="error")

            ActivityLogger(self.db).log(
                tenant_id=execution.tenant_id,
                actor_id=actor_id,
                entity_type=execution.entity_type or "workflow",
                entity_id=execution.entity_id or workflow.id,
                action="workflow_failed",
                title="Workflow failed",
                description=str(exc),
                metadata={"workflow_id": str(workflow.id), "execution_id": str(execution.id)},
            )

            notify_user(
                self.db,
                tenant_id=execution.tenant_id,
                user_id=actor_id or workflow.created_by_id,
                actor_id=actor_id,
                type="workflow_failed",
                title="Workflow failed",
                message=f"'{workflow.name}' failed: {exc}",
                priority="high",
                entity_type="workflow",
                entity_id=workflow.id,
            )

        self.db.commit()
        self.db.refresh(execution)
        return execution
