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

  # Выполняем миграции
  echo "Running database migrations..."
  if npx prisma migrate deploy --schema=./libs/infrustructure/prisma/schema.prisma; then
    echo "✓ Migrations applied successfully"
    return 0
  else
    echo "✗ ERROR: Failed to apply migrations"
    echo "This might happen if:"
    echo "  - Database is not ready yet"
    echo "  - Database connection failed"
    echo "  - Migration files are corrupted"
    return 1
  fi
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

