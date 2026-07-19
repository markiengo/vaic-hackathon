"""002 add reconciliation summary column

Revision ID: 002
Revises: 001
Create Date: 2026-07-19

Adds `summary` JSONB column to `reconciliation_cases` table
to store reconciliation results (matched/unmatched/exception counts, IDs).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "reconciliation_cases",
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reconciliation_cases", "summary")
