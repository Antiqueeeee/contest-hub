"""contestant email encrypted storage with blind index

选手邮箱加密存储（个保法第 51 条）：
- email 列改为加密存储（EncryptedString / Fernet，与身份证号同方案）
- 新增 email_hash（HMAC-SHA256 盲索引），登录与唯一性查重走哈希
- 存量数据：解密（兼容历史明文）→ 重新加密 + 回填哈希

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-07-26 03:00:00.000000
"""
from collections.abc import Sequence
from typing import Union
from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE contestants ALTER COLUMN email TYPE VARCHAR(512)")
    op.execute("ALTER TABLE contestants ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64)")

    from app.utils.crypto import decrypt_value, encrypt_value, keyed_hash
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, email FROM contestants ORDER BY id")).all()

    # 旧唯一约束在明文 email 上（大小写敏感），可能存在仅大小写/空白不同
    # 的重复邮箱（或空邮箱），回填哈希后必然冲突。策略：首条保留规范哈希
    # （该账号可正常登录），其余加 id 后缀消歧并打印告警——这些账号将
    # 无法用该邮箱登录（哈希命中首条），需人工处理，但不阻断部署。
    seen_hashes: set[str] = set()
    for row in rows:
        plain = decrypt_value(row.email)  # 历史明文原样返回
        h = keyed_hash(plain)
        if h in seen_hashes:
            new_h = keyed_hash(f"{plain}#duplicate#{row.id}")
            print(f"WARNING: 选手 id={row.id} 的邮箱哈希与他人冲突（疑似大小写/空白重复），"
                  f"已消歧；该账号将无法通过原邮箱登录，请人工核查")
            h = new_h
        else:
            seen_hashes.add(h)
        bind.execute(
            sa.text("UPDATE contestants SET email = :enc, email_hash = :h WHERE id = :id"),
            {"enc": encrypt_value(plain), "h": h, "id": row.id},
        )

    op.execute("ALTER TABLE contestants ALTER COLUMN email_hash SET NOT NULL")
    # 明文列上的旧唯一索引已不再被模型使用（密文列无查重意义），删除
    op.execute("DROP INDEX IF EXISTS ix_contestants_email")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_contestants_email_hash ON contestants (email_hash)")


def downgrade() -> None:
    from app.utils.crypto import decrypt_value
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, email FROM contestants")).all()
    for row in rows:
        bind.execute(
            sa.text("UPDATE contestants SET email = :plain WHERE id = :id"),
            {"plain": decrypt_value(row.email), "id": row.id},
        )
    op.execute("DROP INDEX IF EXISTS ix_contestants_email_hash")
    op.execute("ALTER TABLE contestants DROP COLUMN IF EXISTS email_hash")
    op.execute("ALTER TABLE contestants ALTER COLUMN email TYPE VARCHAR(255)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_contestants_email ON contestants (email)")
