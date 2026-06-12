"""add_timezone_to_contests

Revision ID: 0d61e0dc949f
Revises:
Create Date: 2026-06-13

"""
from collections.abc import Sequence
from typing import Union
from alembic import op

revision: str = "0d61e0dc949f"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'contests' AND column_name = 'timezone'
            ) THEN
                ALTER TABLE contests ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE contests DROP COLUMN IF EXISTS timezone")
