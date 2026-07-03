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
from app.models import Deal, Lead, Workflow, WorkflowExecution, WorkflowLog, WorkflowVersion
from app.schemas.task import TaskCreate
from app.services.activity_logger import ActivityLogger
from app.services.email_service import send_crm_email
from app.services.notification_hooks import notify_user

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

    def _resolve_definition(self, workflow: Workflow, execution: WorkflowExecution) -> dict:
        version = execution.version or workflow.published_version
        if version:
            row = self.db.scalar(
                select(WorkflowVersion).where(
                    WorkflowVersion.workflow_id == workflow.id,
                    WorkflowVersion.version == version,
                )
            )
            if row and row.snapshot:
                return row.snapshot
        return workflow.definition or {}

    def _entity_uuid(self, value: Any) -> uuid.UUID | None:
        if value is None:
            return None
        try:
            return uuid.UUID(str(value))
        except (TypeError, ValueError):
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
            from app.services.task_service import TaskService

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

        elif action_type == "move_deal":
            from app.services.deal_service import DealService

            deal_id = payload.get("deal_id") or execution.entity_id
            stage = config.get("stage")
            if deal_id and stage and actor_id:
                DealService(self.db).update_stage(
                    tenant_id,
                    uuid.UUID(str(deal_id)),
                    stage,
                    updated_by_id=actor_id,
                )
                self._log(execution, f"Deal moved to {stage}", node_key=node["id"])

        elif action_type == "send_email":
            to_email = config.get("to") or payload.get("email")
            subject = config.get("subject") or f"Workflow: {workflow.name}"
            body = config.get("body") or config.get("message") or ""
            if to_email:
                send_crm_email(
                    to_addresses=[str(to_email)],
                    subject=subject,
                    text_body=body,
                    html_body=f"<p>{body}</p>" if body else None,
                )
                self._log(execution, f"Email sent to {to_email}", node_key=node["id"])

        elif action_type == "create_note":
            from app.schemas.activity import ActivityCreate
            from app.services.activity_service import ActivityService

            entity_type = payload.get("entity_type") or execution.entity_type or "lead"
            entity_id = payload.get("entity_id") or execution.entity_id
            creator = actor_id or workflow.created_by_id
            if entity_id and creator:
                ActivityService(self.db).create_activity(
                    tenant_id,
                    ActivityCreate(
                        entity_type=entity_type,
                        entity_id=uuid.UUID(str(entity_id)),
                        activity_type="note",
                        action="note_added",
                        title=config.get("title") or "Workflow note",
                        description=config.get("description") or config.get("body") or "Automated note.",
                    ),
                    creator,
                )
                self._log(execution, "Note created", node_key=node["id"])

        elif action_type == "create_meeting":
            from app.schemas.meeting import MeetingCreate
            from app.services.meeting_service import MeetingService

            creator = actor_id or workflow.created_by_id
            if creator is None:
                self._log(execution, "Skipped create_meeting: no creator", level="warn", node_key=node["id"])
                return
            start = utcnow() + timedelta(days=int(config.get("start_in_days") or 1))
            end = start + timedelta(minutes=int(config.get("duration_minutes") or 30))
            meeting = MeetingService(self.db).create_meeting(
                tenant_id,
                MeetingCreate(
                    title=config.get("title") or "Workflow meeting",
                    description=config.get("description"),
                    start_datetime=start,
                    end_datetime=end,
                    status="scheduled",
                ),
                creator,
            )
            self._log(execution, f"Meeting created {meeting.id}", node_key=node["id"], data={"meeting_id": str(meeting.id)})

        elif action_type == "create_company":
            from app.schemas.company import CompanyCreate
            from app.services.company_service import CompanyService

            creator = actor_id or workflow.created_by_id
            if creator is None:
                return
            company = CompanyService(self.db).create_company(
                tenant_id,
                CompanyCreate(company_name=config.get("company_name") or "New company"),
                creator,
            )
            self._log(execution, f"Company created {company.id}", node_key=node["id"])

        elif action_type == "create_contact":
            from app.schemas.contact import ContactCreate
            from app.services.contact_service import ContactService

            creator = actor_id or workflow.created_by_id
            if creator is None:
                return
            contact = ContactService(self.db).create_contact(
                tenant_id,
                ContactCreate(
                    first_name=config.get("first_name") or "New",
                    last_name=config.get("last_name") or "Contact",
                    email=config.get("email"),
                ),
                creator,
            )
            self._log(execution, f"Contact created {contact.id}", node_key=node["id"])

        elif action_type == "create_deal":
            from app.schemas.deal import DealCreate
            from app.services.deal_service import DealService

            creator = actor_id or workflow.created_by_id
            if creator is None:
                return
            deal = DealService(self.db).create_deal(
                tenant_id,
                DealCreate(title=config.get("title") or "New deal", stage=config.get("stage") or "new"),
                creator,
            )
            self._log(execution, f"Deal created {deal.id}", node_key=node["id"])

        elif action_type == "archive_deal":
            from app.services.deal_service import DealService

            deal_id = payload.get("deal_id") or execution.entity_id
            if deal_id and actor_id:
                DealService(self.db).update_stage(
                    tenant_id, uuid.UUID(str(deal_id)), "lost", updated_by_id=actor_id
                )
                self._log(execution, "Deal archived (moved to lost)", node_key=node["id"])

        elif action_type == "delete_record":
            entity_type = execution.entity_type or payload.get("entity_type")
            entity_id = execution.entity_id or self._entity_uuid(payload.get("entity_id"))
            if entity_type == "lead" and entity_id and actor_id:
                from app.services.lead_service import LeadService

                LeadService(self.db).delete_lead(tenant_id, entity_id, actor_id)
                self._log(execution, "Lead deleted", node_key=node["id"])
            elif entity_type == "task" and entity_id and actor_id:
                from app.services.task_service import TaskService

                TaskService(self.db).delete_task(tenant_id, entity_id, actor_id)
                self._log(execution, "Task deleted", node_key=node["id"])
            else:
                self._log(execution, "Skipped delete_record: unsupported entity", level="warn", node_key=node["id"])

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

        if node_type == "delay":
            data = node.get("data") or {}
            seconds = min(int((data.get("config") or {}).get("seconds") or data.get("seconds") or 0), MAX_DELAY_SECONDS)
            if seconds > 0:
                self._log(execution, f"Delaying {seconds}s", node_key=node_id)
                self.db.flush()
                time.sleep(seconds)

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
            definition = self._resolve_definition(workflow, execution)
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
