"""Store email attachment bytes in database instead of filesystem.

Revision ID: 018
Revises: 017
"""

from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("email_attachments", sa.Column("content", sa.LargeBinary(), nullable=True))

    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, storage_path FROM email_attachments")).fetchall()
    for row in rows:
        content = b""
        if row.storage_path:
            path = Path(row.storage_path)
            if path.exists():
                content = path.read_bytes()
        conn.execute(
            sa.text("UPDATE email_attachments SET content = :content WHERE id = :id"),
            {"content": content, "id": row.id},
        )

    op.drop_column("email_attachments", "storage_path")
    op.alter_column("email_attachments", "content", nullable=False)


def downgrade() -> None:
    op.add_column("email_attachments", sa.Column("storage_path", sa.String(512), nullable=True))
    op.execute(sa.text("UPDATE email_attachments SET storage_path = '' WHERE storage_path IS NULL"))
    op.alter_column("email_attachments", "storage_path", nullable=False)
    op.drop_column("email_attachments", "content")
