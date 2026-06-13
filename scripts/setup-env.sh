#!/bin/bash
set -e

# ── setup-env.sh ──────────────────────────────────────────────────
# Initialize or update the .env file with all required values.
# Run this whenever you pull new code or deploy to a new machine.
#
# Usage:
#   bash scripts/setup-env.sh
#
# What it does:
#   1. Creates .env from .env.example if it doesn't exist
#   2. Checks each required field — auto-generates secrets, prompts
#      for passwords
#   3. Only adds missing values; never overwrites existing ones
# ──────────────────────────────────────────────────────────────────

cd "$(dirname "$0")/.."

ENV_FILE=".env"
EXAMPLE_FILE=".env.example"

# ── Helpers ─────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get a value from .env, empty if not set
get_env() {
    grep "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | head -1
}

# Set a key=value in .env (add or replace)
set_env() {
    local key="$1" value="$2"
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# Check if a field has a real value (not empty, not a placeholder)
is_set() {
    local val
    val=$(get_env "$1")
    [ -n "$val" ] && [ "$val" != "change-me"* ] && [ "$val" != "your-"* ]
}

# Generate a random secret
gen_secret() {
    python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || \
    openssl rand -hex 32 2>/dev/null
}

gen_fernet_key() {
    python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null
}

# ── Main ────────────────────────────────────────────────────────

echo -e "${GREEN}=== Contest Hub .env Setup ===${NC}"
echo ""

# Create .env from template if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    echo -e "  ${GREEN}✓${NC} Created $ENV_FILE from $EXAMPLE_FILE"
else
    echo -e "  ${GREEN}✓${NC} $ENV_FILE already exists"
fi
echo ""

# ── DB_PASSWORD ─────────────────────────────────────────────────
if is_set "DB_PASSWORD"; then
    echo -e "  ${GREEN}✓${NC} DB_PASSWORD"
else
    echo -e "  ${YELLOW}?${NC} DB_PASSWORD — 请输入数据库密码:"
    read -r -s db_pass
    echo ""
    if [ -z "$db_pass" ]; then
        echo -e "  ${RED}✗${NC} 密码不能为空，已跳过。请稍后手动编辑 $ENV_FILE"
    else
        set_env "DB_PASSWORD" "$db_pass"
        echo -e "  ${GREEN}✓${NC} DB_PASSWORD 已设置"
    fi
fi

# ── JWT_SECRET ──────────────────────────────────────────────────
if is_set "JWT_SECRET"; then
    echo -e "  ${GREEN}✓${NC} JWT_SECRET"
else
    jwt=$(gen_secret)
    set_env "JWT_SECRET" "$jwt"
    echo -e "  ${GREEN}✓${NC} JWT_SECRET 已自动生成"
fi

# ── ENCRYPTION_KEY ──────────────────────────────────────────────
if is_set "ENCRYPTION_KEY"; then
    echo -e "  ${GREEN}✓${NC} ENCRYPTION_KEY"
else
    fkey=$(gen_fernet_key)
    if [ -n "$fkey" ]; then
        set_env "ENCRYPTION_KEY" "$fkey"
        echo -e "  ${GREEN}✓${NC} ENCRYPTION_KEY 已自动生成"
    else
        echo -e "  ${RED}✗${NC} 无法生成 ENCRYPTION_KEY（需要 cryptography 库）。"
        echo "    请手动运行: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        echo "    将输出写入 $ENV_FILE: ENCRYPTION_KEY=<输出值>"
    fi
fi

echo ""
echo -e "${GREEN}=== 完成 ===${NC}"
echo ""
echo "当前 $ENV_FILE 内容（密码已隐藏）:"
grep -v "^DB_PASSWORD=" "$ENV_FILE" | grep -v "^$" | grep -v "^#" || true
echo "DB_PASSWORD=***（已隐藏）"
echo ""
echo "现在可以启动项目: docker compose up -d --build"
