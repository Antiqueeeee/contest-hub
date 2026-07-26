#!/bin/bash
# 数据库定时备份脚本（等保 2.0 数据备份恢复要求）
#
# 功能：
#   - 通过 docker compose 在 db 容器内执行 pg_dump，输出 gzip 压缩备份
#   - 备份文件：backups/contest_hub_YYYYMMDD_HHMMSS.sql.gz
#   - 自动清理 30 天前的旧备份
#   - 失败时打印错误并以非零码退出
#
# 手动执行：
#   bash scripts/backup.sh
#
# crontab 定时备份（每天凌晨 3 点）：
#   0 3 * * * cd /opt/contest-hub && bash scripts/backup.sh >> backups/backup.log 2>&1
#
# 恢复备份：
#   gunzip -c backups/contest_hub_XXXXXXXX_XXXXXX.sql.gz | docker compose exec -T db psql -U contest contest_hub
set -euo pipefail

RETENTION_DAYS=30
BACKUP_DIR="backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/contest_hub_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "=== 开始备份数据库 contest_hub → ${BACKUP_FILE} ==="

if ! docker compose exec -T db pg_dump -U contest contest_hub | gzip > "$BACKUP_FILE"; then
    echo "错误：pg_dump 备份失败，请检查 db 容器是否正常运行（docker compose ps）" >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

if [ ! -s "$BACKUP_FILE" ]; then
    echo "错误：备份文件为空，备份失败" >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo "备份文件大小：$(du -h "$BACKUP_FILE" | cut -f1)"

echo "清理 ${RETENTION_DAYS} 天前的旧备份..."
find "$BACKUP_DIR" -name 'contest_hub_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "=== 备份完成：${BACKUP_FILE} ==="
