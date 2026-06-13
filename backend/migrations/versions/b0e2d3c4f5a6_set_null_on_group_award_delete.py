"""set_null_on_group_award_delete

Revision ID: b0e2d3c4f5a6
Revises: aaeffcbcc3b5
Create Date: 2026-06-13

Change foreign keys on registrations.group_id and results.award_id
to ON DELETE SET NULL so that contest groups/awards can be removed
without breaking existing registration/result records.
"""

from alembic import op

revision = "b0e2d3c4f5a6"
down_revision = "0d61e0dc949f"


def upgrade():
    # Drop old FK, re-add with ondelete SET NULL
    op.drop_constraint("registrations_group_id_fkey", "registrations", type_="foreignkey")
    op.create_foreign_key(
        "registrations_group_id_fkey", "registrations", "contest_groups",
        ["group_id"], ["id"], ondelete="SET NULL",
    )

    op.drop_constraint("results_award_id_fkey", "results", type_="foreignkey")
    op.create_foreign_key(
        "results_award_id_fkey", "results", "awards",
        ["award_id"], ["id"], ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("registrations_group_id_fkey", "registrations", type_="foreignkey")
    op.create_foreign_key(
        "registrations_group_id_fkey", "registrations", "contest_groups",
        ["group_id"], ["id"],
    )

    op.drop_constraint("results_award_id_fkey", "results", type_="foreignkey")
    op.create_foreign_key(
        "results_award_id_fkey", "results", "awards",
        ["award_id"], ["id"],
    )
