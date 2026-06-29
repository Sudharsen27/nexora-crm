"""Database bootstrap: Alembic migrations then permission seeding."""

from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.config import get_settings
from app.db.session import SessionLocal, engine
from app.services.auth_service import seed_permissions

logger = logging.getLogger(__name__)


def _backend_root() -> Path:
    """Resolve backend package root (directory containing alembic.ini)."""
    by_module = Path(__file__).resolve().parents[2]
    if (by_module / "alembic.ini").exists():
        return by_module
    cwd = Path.cwd()
    if (cwd / "alembic.ini").exists():
        return cwd
    raise FileNotFoundError(
        "alembic.ini not found. Run the API from the backend directory or set the correct working directory."
    )


def _alembic_config() -> Config:
    settings = get_settings()
    root = _backend_root()
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    return cfg


def run_migrations() -> None:
    """Apply all pending Alembic revisions (idempotent)."""
    logger.info("Running Alembic migrations...")
    command.upgrade(_alembic_config(), "head")
    logger.info("Alembic migrations complete.")


def _permissions_table_exists() -> bool:
    return "permissions" in inspect(engine).get_table_names()


def bootstrap_database() -> None:
    """
    Production startup order:
      1. Run Alembic migrations
      2. Seed permissions (no-op if tables empty / already seeded)
    """
    settings = get_settings()

    if settings.RUN_MIGRATIONS_ON_STARTUP:
        run_migrations()
    elif not _permissions_table_exists():
        raise RuntimeError(
            "Database schema is missing and RUN_MIGRATIONS_ON_STARTUP is disabled. "
            "Run `alembic upgrade head` or enable RUN_MIGRATIONS_ON_STARTUP."
        )

    if not _permissions_table_exists():
        raise RuntimeError(
            "Migrations finished but the permissions table is still missing. "
            "Check DATABASE_URL and Alembic revision history."
        )

    db = SessionLocal()
    try:
        seed_permissions(db)
        logger.info("Permission seed complete.")
    finally:
        db.close()
