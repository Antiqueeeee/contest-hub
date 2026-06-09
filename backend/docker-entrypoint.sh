#!/bin/bash
set -e

# Wait for database to be resolvable and reachable
echo "Waiting for database..."
for i in $(seq 1 30); do
    if python3 -c "
import socket
try:
    socket.getaddrinfo('db', 5432)
    print('OK')
except Exception:
    pass
" 2>/dev/null | grep -q OK; then
        echo "Database is reachable"
        break
    fi
    echo "  attempt $i/30, retrying..."
    sleep 1
done

echo "Running database seed..."
python seed.py

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
