"""soft_delete_all

Revision ID: c1d2e3f4a5b6
Revises: b0e2d3c4f5a6
Create Date: 2026-06-13

Add deleted_at column to all tables that previously only supported
hard deletes: contests, contest_groups, awards, contest_fields,
news, news_categories, contest_group_templates, contest_group_items.
"""

from alembic import op


revision = "c1d2e3f4a5b6"
down_revision = "b0e2d3c4f5a6"

tables = [
    "contests",
    "contest_groups",
    "awards",
    "contest_fields",
    "news",
    "news_categories",
    "contest_group_templates",
    "contest_group_items",
]


def upgrade():
    # 幂等：initial_schema 的 create_all 基于当前 ORM 元数据，全新库上这些列
    # 可能已存在，逐表逐列检查后再加。
    for t in tables:
        op.execute(f"""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '{t}')
                   AND NOT EXISTS (
                       SELECT 1 FROM information_schema.columns
                       WHERE table_name = '{t}' AND column_name = 'deleted_at'
                   ) THEN
                    ALTER TABLE {t} ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
                END IF;
            END $$;
        """)


def downgrade():
    for t in tables:
        op.execute(f"ALTER TABLE {t} DROP COLUMN IF EXISTS deleted_at")
