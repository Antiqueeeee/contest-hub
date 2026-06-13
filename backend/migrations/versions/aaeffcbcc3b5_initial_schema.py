"""initial_schema

Revision ID: aaeffcbcc3b5
Revises:
Create Date: 2026-06-13

Baseline migration that captures the full table structure from the ORM models.
Serves as the foundation of the migration chain — every subsequent migration
builds on this.  Idempotent:  uses checkfirst=True, safe to re-run.
"""
from collections.abc import Sequence
from typing import Union
from alembic import op

revision: str = "aaeffcbcc3b5"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.database import Base
    import app.models  # noqa: F401 — ensures all tables are registered on Base.metadata

    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    from app.database import Base
    import app.models  # noqa: F401

    Base.metadata.drop_all(bind=op.get_bind())
