"""contestant id_number lazy binding

最小必要原则改造：
1. contestants.id_number 改为可空 —— 注册时不再收集身份证号，
   首次报名时再绑定到账号。
2. 清理冗余：账号报名的 registrations.form_data 中不再保存身份证号副本
   （两处密文由 Fernet 分别生成、并不相同，但明文一致，
   以账号上的副本为准，删除报名记录中的副本）。

Revision ID: d4e5f6a7b8c9
Revises: 2b3c4d5e6f7a
Create Date: 2026-07-26 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union
from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "2b3c4d5e6f7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("contestants", "id_number", existing_type=sa.String(512), nullable=True)
    # form_data 是 json 类型，jsonb 的 '-' / '?' 操作符需要显式转换
    op.execute("""
        UPDATE registrations
        SET form_data = (form_data::jsonb - 'id_number')::json
        WHERE contestant_id IS NOT NULL AND form_data::jsonb ? 'id_number'
    """)


def downgrade() -> None:
    # 把账号上的身份证号密文回填到 form_data（与升级前结构一致）
    op.execute("""
        UPDATE registrations r
        SET form_data = (r.form_data::jsonb || jsonb_build_object('id_number', c.id_number))::json
        FROM contestants c
        WHERE r.contestant_id = c.id AND c.id_number IS NOT NULL
    """)
    op.execute("UPDATE contestants SET id_number = '' WHERE id_number IS NULL")
    op.alter_column("contestants", "id_number", existing_type=sa.String(512), nullable=False)
