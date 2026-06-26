#!/bin/sh
set -eu

cd /app

if [ ! -f .next/BUILD_ID ]; then
  echo "FATAL: .next/BUILD_ID missing — run npm run build in the image" >&2
  ls -la .next 2>&1 || true
  exit 1
fi

if [ ! -x ./node_modules/.bin/next ]; then
  echo "FATAL: ./node_modules/.bin/next not found" >&2
  exit 1
fi

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3002}"

echo "Starting admin Next.js on ${HOSTNAME}:${PORT} (BUILD_ID=$(cat .next/BUILD_ID))"
exec ./node_modules/.bin/next start -H "$HOSTNAME" -p "$PORT"
