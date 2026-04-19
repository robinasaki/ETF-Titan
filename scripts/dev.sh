#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/apps/server"
WEB_DIR="$ROOT_DIR/apps/web"
EXPOSE_MODE="${1:-local}"
API_PORT="${API_PORT:-8000}"
REUSE_API_SERVER="${REUSE_API_SERVER:-0}"

cd "$ROOT_DIR"

if [ -x "$SERVER_DIR/.venv/bin/python" ]; then
  PYTHON_BIN="$SERVER_DIR/.venv/bin/python"
else
  PYTHON_BIN="python3"
fi

if [ "$EXPOSE_MODE" = "lan" ]; then
  API_HOST="0.0.0.0"
  WEB_HOST="0.0.0.0"
  echo "Starting FastAPI backend and React frontend for LAN access..."
else
  API_HOST="127.0.0.1"
  WEB_HOST="localhost"
  echo "Starting FastAPI backend and React frontend for local access..."
fi

api_health_url="http://127.0.0.1:$API_PORT/health"

if [ "$REUSE_API_SERVER" = "1" ] && "$PYTHON_BIN" - "$api_health_url" <<'PY'
import sys
import urllib.request

url = sys.argv[1]

try:
    with urllib.request.urlopen(url, timeout=1) as response:
        sys.exit(0 if response.status == 200 else 1)
except Exception:
    sys.exit(1)
PY
then
  echo "Reusing existing API server at $api_health_url."
  exec bun --cwd "$WEB_DIR" dev -- --host "$WEB_HOST"
fi

exec bunx concurrently \
  --kill-others \
  --names "API,WEB" \
  --prefix "[{name}]" \
  "\"$PYTHON_BIN\" -m uvicorn app.main:app --app-dir \"$SERVER_DIR\" --reload --host $API_HOST --port $API_PORT" \
  "bun --cwd \"$WEB_DIR\" dev -- --host $WEB_HOST"
