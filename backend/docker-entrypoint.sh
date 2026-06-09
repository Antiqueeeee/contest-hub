#!/bin/bash
set -e

# Resolve db hostname and swap to raw IP (bypass asyncio DNS bug)
echo "Waiting for database..."
for i in $(seq 1 30); do
    DB_IP=$(getent hosts db | awk '{print $1}')
    if [ -n "$DB_IP" ]; then
        echo "Database resolved: $DB_IP"
        export DATABASE_URL="${DATABASE_URL//db/$DB_IP}"
        echo "Using: ${DATABASE_URL//:*@/:***@}"
        break
    fi
    echo "  attempt $i/30, retrying..."
    sleep 1
done

echo "Running database seed..."
python seed.py

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
