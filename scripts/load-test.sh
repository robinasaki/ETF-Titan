#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Generating backend load fixtures..."
python3 apps/server/tests/fixtures/load/generate_large_csvs.py

echo "Running backend load test..."
if [ -x apps/server/.venv/bin/python ]; then
  apps/server/.venv/bin/python -m unittest apps/server/tests/load_test_etfs.py
else
  python3 -m unittest apps/server/tests/load_test_etfs.py
fi
