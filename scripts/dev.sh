#!/usr/bin/env bash
set -euo pipefail

backend_pid=""
frontend_pid=""
backend_port="${BACKEND_PORT:-3003}"
frontend_port="${FRONTEND_PORT:-5174}"
frontend_api_base="${VITE_API_BASE_URL:-http://localhost:${backend_port}/api}"

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

PORT="$backend_port" npm --prefix backend run start:dev &
backend_pid=$!

VITE_API_BASE_URL="$frontend_api_base" npm --prefix frontend run dev -- --port "$frontend_port" &
frontend_pid=$!

set +e
wait "$backend_pid" "$frontend_pid"
status=$?
set -e

exit "$status"
