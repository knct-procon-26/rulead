#!/bin/sh
set -e

echo "[entrypoint] migrations ..."
bun run src/db/migrate.ts

echo "[entrypoint] starting app..."
exec bun run src/index.ts
