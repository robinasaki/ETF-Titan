#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-8000}"
UVICORN_PATTERN='uvicorn app.main:app'

declare -a candidate_pids=()

add_pid() {
  local pid="$1"
  if [ -z "$pid" ]; then
    return
  fi
  for existing_pid in "${candidate_pids[@]:-}"; do
    if [ "$existing_pid" = "$pid" ]; then
      return
    fi
  done
  candidate_pids+=("$pid")
}

while IFS= read -r pid; do
  add_pid "$pid"
done < <(lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null || true)

while IFS= read -r pid; do
  add_pid "$pid"
done < <(pgrep -f "$UVICORN_PATTERN" || true)

if [ "${#candidate_pids[@]}" -eq 0 ]; then
  echo "No API processes found for port $API_PORT."
  exit 0
fi

declare -a killed_pids=()

for pid in "${candidate_pids[@]}"; do
  if ! ps -p "$pid" >/dev/null 2>&1; then
    continue
  fi

  command="$(ps -p "$pid" -o command= || true)"
  if [[ "$command" == *"$UVICORN_PATTERN"* ]] || [[ "$command" == *"--port $API_PORT"* ]]; then
    kill "$pid" 2>/dev/null || true
    killed_pids+=("$pid")
  fi
done

if [ "${#killed_pids[@]}" -eq 0 ]; then
  echo "No matching API processes required termination."
  exit 0
fi

sleep 1
for pid in "${killed_pids[@]}"; do
  if ps -p "$pid" >/dev/null 2>&1; then
    kill -9 "$pid" 2>/dev/null || true
  fi
done

echo "Stopped API process(es): ${killed_pids[*]}"
