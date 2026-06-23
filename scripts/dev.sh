#!/usr/bin/env bash
set -euo pipefail

backend_pid=""
frontend_pid=""

is_port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

find_available_port() {
  local requested_port="$1"
  local port="$requested_port"
  local max_port=65535

  if [[ ! "$requested_port" =~ ^[0-9]+$ ]] || ((requested_port <= 0 || requested_port > 65535)); then
    echo "잘못된 포트 값입니다: $requested_port" >&2
    exit 1
  fi

  while is_port_in_use "$port"; do
    if ((port >= max_port)); then
      echo "사용 가능한 포트를 찾지 못했습니다. 시작 포트: $requested_port" >&2
      exit 1
    fi
    ((port += 1))
  done

  if ((port != requested_port)); then
    echo "포트 $requested_port 가 사용 중이어서 $port 로 자동 전환했습니다." >&2
  fi

  printf '%s\n' "$port"
}

# Load apps/api/.env if it exists to import DATABASE_URL, etc.
if [ -f apps/api/.env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    
    key="${line%%=*}"
    val="${line#*=}"
    
    # Remove surrounding quotes
    val="${val#\"}"
    val="${val%\"}"
    val="${val#\'}"
    val="${val%\'}"
    
    if ! env | grep -q "^$key="; then
      export "$key"="$val"
    fi
  done < apps/api/.env
fi

requested_backend_port="${BACKEND_PORT:-3003}"
requested_frontend_port="${FRONTEND_PORT:-4174}"

backend_port="$(find_available_port "$requested_backend_port")"
frontend_port="$(find_available_port "$requested_frontend_port")"

frontend_api_base="${VITE_API_BASE_URL:-http://localhost:${backend_port}/api}"
backend_cors_origins="${CORS_ORIGINS:-"http://localhost:${frontend_port},http://127.0.0.1:${frontend_port},http://localhost:5173,http://127.0.0.1:5173,http://localhost:4174,http://127.0.0.1:4174,http://localhost:5174,http://127.0.0.1:5174"}"

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

PORT="$backend_port" CORS_ORIGINS="$backend_cors_origins" pnpm --dir apps/api run start:dev &
backend_pid=$!

VITE_API_BASE_URL="$frontend_api_base" pnpm --dir apps/web run dev -- --port "$frontend_port" &
frontend_pid=$!

set +e
wait "$backend_pid" "$frontend_pid"
status=$?
set -e

exit "$status"
