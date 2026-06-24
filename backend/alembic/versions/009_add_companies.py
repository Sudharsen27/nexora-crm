"""add companies table and company relationships

Revision ID: 009
Revises: 008
Create Date: 2026-06-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("company_code", sa.String(length=50), nullable=True),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("annual_revenue", sa.Numeric(precision=16, scale=2), nullable=True),
        sa.Column("employee_count", sa.Integer(), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "company_code", name="uq_companies_tenant_code"),
    )
    op.create_index("ix_companies_tenant_id", "companies", ["tenant_id"])
    op.create_index("ix_companies_tenant_created_at", "companies", ["tenant_id", "created_at"])
    op.create_index("ix_companies_tenant_industry", "companies", ["tenant_id", "industry"])

    op.add_column(
        "contacts",
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_contacts_company_id",
        "contacts",
        "companies",
        ["company_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_contacts_tenant_company", "contacts", ["tenant_id", "company_id"])

    op.add_column(
        "deals",
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_deals_company_id",
        "deals",
        "companies",
        ["company_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_deals_tenant_company", "deals", ["tenant_id", "company_id"])


def downgrade() -> None:
    op.drop_index("ix_deals_tenant_company", table_name="deals")
    op.drop_constraint("fk_deals_company_id", "deals", type_="foreignkey")
    op.drop_column("deals", "company_id")

    op.drop_index("ix_contacts_tenant_company", table_name="contacts")
    op.drop_constraint("fk_contacts_company_id", "contacts", type_="foreignkey")
    op.drop_column("contacts", "company_id")

    op.drop_index("ix_companies_tenant_industry", table_name="companies")
    op.drop_index("ix_companies_tenant_created_at", table_name="companies")
    op.drop_index("ix_companies_tenant_id", table_name="companies")
    op.drop_table("companies")
