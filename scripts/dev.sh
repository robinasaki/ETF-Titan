#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/apps/server"
WEB_DIR="$ROOT_DIR/apps/web"
EXPOSE_MODE="${1:-local}"

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

exec bunx concurrently \
  --kill-others \
  --names "API,WEB" \
  --prefix "[{name}]" \
  "$PYTHON_BIN -m uvicorn app.main:app --app-dir \"$SERVER_DIR\" --reload --host $API_HOST --port 8000" \
  "bun --cwd \"$WEB_DIR\" dev -- --host $WEB_HOST"
