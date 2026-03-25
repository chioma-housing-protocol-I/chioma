#!/bin/bash
# Database Backup Script
# Uses DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME from env (or .env).
# Optional: BACKUP_DIR (default /var/backups/chioma), RETENTION_DAYS (default 30).
# For Docker: set USE_DOCKER=1 and DOCKER_CONTAINER=chioma-postgres-production.

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/chioma}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_NAME="${DB_NAME:-chioma_db}"

mkdir -p "$BACKUP_DIR"
echo "Starting database backup..."

if [ "${USE_DOCKER}" = "1" ]; then
  CONTAINER="${DOCKER_CONTAINER:-chioma-postgres-production}"
  docker exec "$CONTAINER" pg_dump -U "$DB_USERNAME" "$DB_NAME" > "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
else
  export PGPASSWORD="${DB_PASSWORD}"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$DB_NAME" -F p -f "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
  unset PGPASSWORD
fi

ln -sf "$BACKUP_DIR/backup_${TIMESTAMP}.sql" "$BACKUP_DIR/latest_db_backup.sql"
gzip "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
echo "✓ Backup created: backup_${TIMESTAMP}.sql.gz"

find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo "✓ Backup completed successfully"
