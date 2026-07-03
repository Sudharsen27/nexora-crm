"""Dispatch workflow triggers from domain events."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.workflow import Workflow
from app.services.workflow_runner import run_workflow_execution_background
from app.services.workflow_service import WorkflowService

logger = logging.getLogger(__name__)


class WorkflowTriggerService:
    def __init__(self, db: Session):
        self.db = db

    def dispatch(
        self,
        tenant_id: uuid.UUID,
        trigger_type: str,
        payload: dict,
        *,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        actor_id: uuid.UUID | None = None,
    ) -> None:
        workflows = self.db.scalars(
            select(Workflow).where(
                Workflow.tenant_id == tenant_id,
                Workflow.status == "published",
                Workflow.trigger_type == trigger_type,
                Workflow.is_template.is_(False),
            )
        ).all()

        for workflow in workflows:
            execution = WorkflowService(self.db).queue_execution(
                tenant_id,
                workflow.id,
                trigger_type=trigger_type,
                payload=payload,
                entity_type=entity_type,
                entity_id=entity_id,
                actor_id=actor_id,
                run_immediately=False,
            )
            run_workflow_execution_background(execution.id, actor_id=actor_id)


def dispatch_workflow_trigger(
    tenant_id: uuid.UUID,
    trigger_type: str,
    payload: dict,
    *,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    actor_id: uuid.UUID | None = None,
) -> None:
    """Fire-and-forget trigger dispatch using a fresh DB session."""
    db = SessionLocal()
    try:
        WorkflowTriggerService(db).dispatch(
            tenant_id,
            trigger_type,
            payload,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
        )
    except Exception:
        logger.exception("Failed to dispatch workflow trigger %s", trigger_type)
        db.rollback()
    finally:
        db.close()
