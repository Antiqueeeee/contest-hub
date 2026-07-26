"""registration unique index for race-safe dedup

为账号报名加部分唯一索引，兜底 check-then-insert 的并发竞态
（双击/重试/并发下同账号同赛事同组别重复提交）。

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-26 01:00:00.000000
"""
from collections.abc import Sequence
from typing import Union
from alembic import op


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # group_id 可空，用 COALESCE 归一化（组别 id 从 1 开始，0 无冲突）；
    # 软删除的记录不参与去重（删除后可重新报名）。
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_registrations_contest_group_contestant
        ON registrations (contest_id, COALESCE(group_id, 0), contestant_id)
        WHERE contestant_id IS NOT NULL AND deleted_at IS NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ux_registrations_contest_group_contestant")
