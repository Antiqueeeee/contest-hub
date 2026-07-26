"""user rights and retention tables

个保法用户权利与数据保留改造：
- consent_logs：同意记录流水（授予/撤回，含政策版本与 IP）
- system_settings：后台可配置参数（数据保留期限等）
- export_tasks：导出任务落库（替代内存字典）
- contestants.deleted_at：自助注销标记

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-26 02:00:00.000000
"""
from collections.abc import Sequence
from typing import Union
from alembic import op


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consent_logs') THEN
                CREATE TABLE consent_logs (
                    id SERIAL PRIMARY KEY,
                    contestant_id INTEGER REFERENCES contestants(id),
                    email VARCHAR(255) NOT NULL DEFAULT '',
                    consent_type VARCHAR(40) NOT NULL,
                    action VARCHAR(20) NOT NULL,
                    policy_version VARCHAR(40) NOT NULL DEFAULT '',
                    ip_address VARCHAR(45) NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX ix_consent_logs_contestant_id ON consent_logs (contestant_id);
                CREATE INDEX ix_consent_logs_consent_type ON consent_logs (consent_type);
                CREATE INDEX ix_consent_logs_created_at ON consent_logs (created_at);
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
                CREATE TABLE system_settings (
                    key VARCHAR(80) PRIMARY KEY,
                    value TEXT NOT NULL DEFAULT ''
                );
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'export_tasks') THEN
                CREATE TABLE export_tasks (
                    id VARCHAR(20) PRIMARY KEY,
                    status VARCHAR(20) NOT NULL DEFAULT 'processing',
                    file_path VARCHAR(500) NOT NULL DEFAULT '',
                    filename VARCHAR(300) NOT NULL DEFAULT '',
                    error VARCHAR(1000) NOT NULL DEFAULT '',
                    created_by INTEGER,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX ix_export_tasks_created_at ON export_tasks (created_at);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'contestants' AND column_name = 'deleted_at'
            ) THEN
                ALTER TABLE contestants ADD COLUMN deleted_at TIMESTAMPTZ;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE contestants DROP COLUMN IF EXISTS deleted_at")
    op.execute("DROP TABLE IF EXISTS export_tasks")
    op.execute("DROP TABLE IF EXISTS system_settings")
    op.execute("DROP TABLE IF EXISTS consent_logs")
