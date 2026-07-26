"""append-only triggers for audit and consent logs

等保 2.0 安全审计 a)：审计日志不可删除、不可修改。
对 audit_logs 与 consent_logs 加数据库级触发器，UPDATE/DELETE 直接报错，
日志只能 INSERT（应用层本就没有删改接口，此处为纵深防御）。

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-07-26 03:30:00.000000
"""
from collections.abc import Sequence
from typing import Union
from alembic import op


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # DELETE 一律禁止；UPDATE 仅允许持有事务级维护标记的合规任务
    # （注销时的历史邮箱脱敏、审计日志 IP 到期匿名化），其余 UPDATE 禁止。
    op.execute("""
        CREATE OR REPLACE FUNCTION forbid_log_mutation() RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'audit/consent logs are append-only';
            END IF;
            IF current_setting('app.log_maintenance', true) = 'on' THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'audit/consent logs are append-only';
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
        CREATE TRIGGER trg_audit_logs_append_only
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION forbid_log_mutation();

        DROP TRIGGER IF EXISTS trg_consent_logs_append_only ON consent_logs;
        CREATE TRIGGER trg_consent_logs_append_only
        BEFORE UPDATE OR DELETE ON consent_logs
        FOR EACH ROW EXECUTE FUNCTION forbid_log_mutation();

        -- 高频查询（登录锁定计数、批量查看告警）走复合索引
        CREATE INDEX IF NOT EXISTS ix_audit_logs_type_operator_created
        ON audit_logs (event_type, operator, created_at);
    """)


def downgrade() -> None:
    op.execute("""
        DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
        DROP TRIGGER IF EXISTS trg_consent_logs_append_only ON consent_logs;
        DROP FUNCTION IF EXISTS forbid_log_mutation();
    """)
