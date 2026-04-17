#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running frontend type checks..."
bun run check

echo "Running frontend unit tests..."
bun --cwd apps/web test

echo "Running backend unit tests..."
if [ -x apps/server/.venv/bin/python ]; then
  apps/server/.venv/bin/python -m unittest discover -s apps/server/tests -p "test*.py"
else
  python3 -m unittest discover -s apps/server/tests -p "test*.py"
fi
