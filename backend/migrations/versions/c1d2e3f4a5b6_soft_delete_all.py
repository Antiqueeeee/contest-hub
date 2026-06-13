"""soft_delete_all

Revision ID: c1d2e3f4a5b6
Revises: b0e2d3c4f5a6
Create Date: 2026-06-13

Add deleted_at column to all tables that previously only supported
hard deletes: contests, contest_groups, awards, contest_fields,
news, news_categories, contest_group_templates, contest_group_items.
"""

from alembic import op
import sqlalchemy as sa

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
    for t in tables:
        op.add_column(t, sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    for t in tables:
        op.drop_column(t, "deleted_at")
