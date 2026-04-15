#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/apps/server"
WEB_DIR="$ROOT_DIR/apps/web"

cd "$ROOT_DIR"

if [ -x "$SERVER_DIR/.venv/bin/python" ]; then
  PYTHON_BIN="$SERVER_DIR/.venv/bin/python"
else
  PYTHON_BIN="python3"
fi

echo "Starting FastAPI backend and React frontend..."
exec bunx concurrently \
  --kill-others \
  --names "API,WEB" \
  --prefix "[{name}]" \
  "$PYTHON_BIN -m uvicorn app.main:app --app-dir \"$SERVER_DIR\" --reload --host 0.0.0.0 --port 8000" \
  "bun --cwd \"$WEB_DIR\" dev"
