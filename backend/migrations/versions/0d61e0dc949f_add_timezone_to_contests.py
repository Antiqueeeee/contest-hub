"""add_timezone_to_contests

Revision ID: 0d61e0dc949f
Revises: aaeffcbcc3b5
Create Date: 2026-06-13

"""
from collections.abc import Sequence
from typing import Union
from alembic import op

revision: str = "0d61e0dc949f"
down_revision: Union[str, None] = "aaeffcbcc3b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 幂等：表存在 + 列不存在 才加列。全新空库表不存在时跳过，交给 init_db 的 create_all
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contests')
               AND NOT EXISTS (
                   SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contests' AND column_name = 'timezone'
               ) THEN
                ALTER TABLE contests ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE contests DROP COLUMN IF EXISTS timezone")
