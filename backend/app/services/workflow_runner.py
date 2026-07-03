"""Background workflow execution — decouples HTTP requests from engine runs."""

from __future__ import annotations

import logging
import threading
import uuid

from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


def run_workflow_execution_background(
    execution_id: uuid.UUID,
    *,
    actor_id: uuid.UUID | None = None,
) -> None:
    """Run workflow execution in a daemon thread (Render-friendly, no Celery required)."""

    def _run() -> None:
        from app.services.workflow_engine import WorkflowEngine

        db = SessionLocal()
        try:
            WorkflowEngine(db).run_execution(execution_id, actor_id=actor_id)
        except Exception:
            logger.exception("Background workflow execution failed: %s", execution_id)
            db.rollback()
        finally:
            db.close()

    threading.Thread(target=_run, daemon=True, name=f"workflow-{execution_id}").start()
