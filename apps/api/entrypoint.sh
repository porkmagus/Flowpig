#!/bin/sh
set -e

echo "[api] Ensuring database schema is up to date..."
cd /app/packages/db
npx prisma db push --accept-data-loss

echo "[api] Starting server..."
cd /app/apps/api
exec node .output/server/index.mjs
