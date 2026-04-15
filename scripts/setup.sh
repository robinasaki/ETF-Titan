#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/apps/server"

cd "$ROOT_DIR"
echo "Installing Bun workspace dependencies..."
bun i --verbose

if [ ! -d "$SERVER_DIR" ]; then
  echo "Expected backend directory at $SERVER_DIR" >&2
  exit 1
fi

cd "$SERVER_DIR"

if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi

PYTHON_BIN=".venv/bin/python"

if [ ! -x "$PYTHON_BIN" ]; then
  echo "Python virtual environment is missing its interpreter at $PYTHON_BIN" >&2
  exit 1
fi

echo "Installing Python backend dependencies..."
"$PYTHON_BIN" -m pip install -r requirements.txt

echo "Setup complete."
