"""add carousel_slides

Revision ID: 1a2b3c4d5e6f
Revises: 0d61e0dc949f
Create Date: 2026-06-14 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union
from alembic import op
import sqlalchemy as sa


revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, None] = "0d61e0dc949f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carousel_slides') THEN
                CREATE TABLE carousel_slides (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(200) NOT NULL DEFAULT '',
                    image_url VARCHAR(500) NOT NULL DEFAULT '',
                    link_url VARCHAR(500) NOT NULL DEFAULT '',
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS carousel_slides")
