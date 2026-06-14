"""add audit_logs

Revision ID: 2b3c4d5e6f7a
Revises: 1a2b3c4d5e6f
Create Date: 2026-06-14 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "2b3c4d5e6f7a"
down_revision: Union[str, None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
                CREATE TABLE audit_logs (
                    id SERIAL PRIMARY KEY,
                    event_type VARCHAR(80) NOT NULL,
                    operator VARCHAR(255) NOT NULL DEFAULT '',
                    operator_id INTEGER,
                    target VARCHAR(500) NOT NULL DEFAULT '',
                    target_type VARCHAR(80),
                    detail JSONB,
                    ip_address VARCHAR(45) NOT NULL DEFAULT '',
                    user_agent TEXT NOT NULL DEFAULT '',
                    result VARCHAR(20) NOT NULL DEFAULT 'success',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX ix_audit_logs_event_type ON audit_logs (event_type);
                CREATE INDEX ix_audit_logs_operator_id ON audit_logs (operator_id);
                CREATE INDEX ix_audit_logs_created_at ON audit_logs (created_at);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_logs")
