#!/bin/sh
# Combined startup: FastAPI (internal :8001) + Next.js standalone (public :$PORT)
# Browser → Next.js (:$PORT) → /api/backend/* → FastAPI (:8001) → Supabase
set -e

INTERNAL_PORT=8001
EXTERNAL_PORT="${PORT:-3000}"

# ── 1. Start FastAPI backend on internal-only port ─────────────────────────
echo "[taxlens] Starting FastAPI on 127.0.0.1:${INTERNAL_PORT}"
cd /app/backend
uvicorn app.main:app \
  --host 127.0.0.1 \
  --port "${INTERNAL_PORT}" \
  --workers 1 &
BACKEND_PID=$!

# ── 2. Wait for FastAPI health endpoint (up to 30 s) ──────────────────────
echo "[taxlens] Waiting for backend health check..."
i=0
while [ "$i" -lt 30 ]; do
  if curl -sf "http://127.0.0.1:${INTERNAL_PORT}/health" > /dev/null 2>&1; then
    echo "[taxlens] Backend ready."
    break
  fi
  sleep 1
  i=$((i + 1))
done

# ── 3. Start Next.js standalone on the public Render port ─────────────────
echo "[taxlens] Starting Next.js on 0.0.0.0:${EXTERNAL_PORT}"
cd /app/frontend
exec env \
  TAXLENS_BACKEND_URL="http://127.0.0.1:${INTERNAL_PORT}" \
  PORT="${EXTERNAL_PORT}" \
  HOSTNAME="0.0.0.0" \
  node server.js
