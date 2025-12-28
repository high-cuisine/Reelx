#!/bin/sh
set -e

echo "Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set!"
  exit 1
fi

echo "DATABASE_URL is set (credentials hidden for security)"

echo "Waiting for database to be ready..."
sleep 5

echo "Running database migrations or pushing schema..."
npx prisma migrate deploy --schema=./libs/infrustructure/prisma/schema.prisma 2>/dev/null || \
npx prisma db push --schema=./libs/infrustructure/prisma/schema.prisma --accept-data-loss || \
echo "Note: Database schema may already be up to date"

echo "Starting application..."
exec "$@"

