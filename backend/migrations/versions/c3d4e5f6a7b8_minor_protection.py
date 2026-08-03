"""minor protection module (未成年人保护模块)

可选启用的未成年人保护模块（客户开关）：
1. contestants 新增出生日期与监护人信息字段（加密存储、可空、
   懒收集——仅报名面向未成年人的赛事时收集并绑定到账号）。
2. contests 新增 minor_policy 赛事级开关（normal / minors_welcome，
   默认 normal，系统开关关闭时不影响任何流程）。

幂等说明：initial_schema 以 Base.metadata.create_all 从当前模型建表，
全新空库的表已包含本迁移的列；本迁移只对存量部署生效（列存在则跳过）。
此写法与 0d61e0dc949f（timezone）保持一致。

Revision ID: c3d4e5f6a7b8
Revises: b8c9d0e1f2a3
Create Date: 2026-08-03 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union
from alembic import op


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 注意：模型声明为原生 PG 枚举 Enum(MinorPolicy)（类型名 minorpolicy），
    # 存量库必须同步创建该枚举类型，否则 ORM 对 contests 的读写全部报
    # UndefinedObjectError（新库由 create_all 自动创建类型与列，此处跳过）。
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contestants') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name = 'contestants' AND column_name = 'birth_date') THEN
                    ALTER TABLE contestants ADD COLUMN birth_date VARCHAR(512);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name = 'contestants' AND column_name = 'guardian_name') THEN
                    ALTER TABLE contestants ADD COLUMN guardian_name VARCHAR(512);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name = 'contestants' AND column_name = 'guardian_contact') THEN
                    ALTER TABLE contestants ADD COLUMN guardian_contact VARCHAR(512);
                END IF;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contests') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'minorpolicy') THEN
                    CREATE TYPE minorpolicy AS ENUM ('normal', 'minors_welcome');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name = 'contests' AND column_name = 'minor_policy') THEN
                    ALTER TABLE contests ADD COLUMN minor_policy minorpolicy NOT NULL DEFAULT 'normal';
                END IF;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE contests DROP COLUMN IF EXISTS minor_policy")
    op.execute("DROP TYPE IF EXISTS minorpolicy")
    op.execute("ALTER TABLE contestants DROP COLUMN IF EXISTS guardian_contact")
    op.execute("ALTER TABLE contestants DROP COLUMN IF EXISTS guardian_name")
    op.execute("ALTER TABLE contestants DROP COLUMN IF EXISTS birth_date")
