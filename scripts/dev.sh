#!/usr/bin/env bash
set -euo pipefail

backend_pid=""
frontend_pid=""

cleanup() {
  local pids=("$backend_pid" "$frontend_pid")

  for pid in "${pids[@]}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done

  for pid in "${pids[@]}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      wait "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT INT TERM

npm --prefix backend run start:dev &
backend_pid=$!

npm --prefix frontend run dev &
frontend_pid=$!

set +e
wait "$backend_pid" "$frontend_pid"
status=$?
set -e

exit "$status"
