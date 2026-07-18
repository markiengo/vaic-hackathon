"""002 add period to agent_runs

Revision ID: 002
Revises: 001
Create Date: 2026-07-19

Adds `period` (TEXT, nullable) column to agent_runs table.
Required for P0: run_agent_workflow() needs to query active runs by merchant_id + period
without access to the original HTTP request context.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("agent_runs", sa.Column("period", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("agent_runs", "period")
