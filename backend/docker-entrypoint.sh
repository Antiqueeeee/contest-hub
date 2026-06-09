#!/bin/bash
set -e

# Resolve db IP and write to /etc/hosts (bypass Docker DNS for asyncio)
echo "Waiting for database..."
for i in $(seq 1 30); do
    DB_IP=$(getent hosts db | awk '{print $1}')
    if [ -n "$DB_IP" ]; then
        echo "$DB_IP db" >> /etc/hosts
        echo "Database resolved: $DB_IP"
        break
    fi
    echo "  attempt $i/30, retrying..."
    sleep 1
done

echo "Running database seed..."
python seed.py

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
