#!/bin/sh
set -e

# Функция для выполнения миграций
run_migrations() {
  echo "Checking environment variables..."
  if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set!"
    return 1
  fi

  echo "DATABASE_URL is set (credentials hidden for security)"

  # Ждем готовности базы данных
  echo "Waiting for database to be ready..."
  sleep 3

  SCHEMA=./libs/infrustructure/prisma/schema.prisma
  MIGRATIONS_DIR=./libs/infrustructure/prisma/migrations

  # migrate deploy применяет только SQL из migrations/ — без папки таблицы не появятся
  if [ -d "$MIGRATIONS_DIR" ] && [ -n "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
    echo "Running database migrations (prisma migrate deploy)..."
    if npx prisma migrate deploy --schema="$SCHEMA"; then
      echo "✓ Migrations applied successfully"
      return 0
    fi
    echo "✗ migrate deploy failed"
    return 1
  fi

  echo "No prisma/migrations in image — syncing schema with the database (prisma db push)..."
  if npx prisma db push --schema="$SCHEMA" --skip-generate; then
    echo "✓ Schema pushed successfully"
    return 0
  fi
  echo "✗ ERROR: prisma db push failed"
  return 1
}

# Если скрипт запущен с аргументами (из Docker), выполняем миграции и запускаем приложение
if [ $# -gt 0 ]; then
  run_migrations
  echo "Starting application..."
  exec "$@"
else
  # Если скрипт запущен без аргументов (вручную в терминале), только выполняем миграции
  run_migrations
fi

