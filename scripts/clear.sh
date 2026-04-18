#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$REPO_ROOT/apps/server/storage/tmp"
UPLOADS_DIR="$REPO_ROOT/apps/server/storage/uploads"

clear_storage_dir() {
  local dir_path="$1"
  if [ ! -d "$dir_path" ]; then
    mkdir -p "$dir_path"
  fi

  shopt -s nullglob
  local csv_files=("$dir_path"/*.csv)
  shopt -u nullglob

  if [ "${#csv_files[@]}" -eq 0 ]; then
    return
  fi

  rm -f "${csv_files[@]}"
}

clear_storage_dir "$TMP_DIR"
clear_storage_dir "$UPLOADS_DIR"

echo "Cleared server upload buckets (tmp and uploads)."
