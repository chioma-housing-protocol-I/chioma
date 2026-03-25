#!/bin/bash
# Database Restore Script
# Restores from a backup file. Uses DB_* env vars for target database.
# Usage: ./scripts/db-restore.sh [path_to_backup.sql.gz]
#   If no path given, uses BACKUP_DIR/latest_db_backup.sql or BACKUP_DIR/latest_db_backup.sql.gz

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/chioma}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_NAME="${DB_NAME:-chioma_db}"

if [ -n "$1" ]; then
  BACKUP_FILE="$1"
else
  if [ -f "$BACKUP_DIR/latest_db_backup.sql" ]; then
    BACKUP_FILE="$BACKUP_DIR/latest_db_backup.sql"
  elif [ -f "$BACKUP_DIR/latest_db_backup.sql.gz" ]; then
    BACKUP_FILE="$BACKUP_DIR/latest_db_backup.sql.gz"
  else
    echo "No backup file specified and none found at $BACKUP_DIR/latest_db_backup.sql[.gz]"
    exit 1
  fi
fi

echo "Restoring from $BACKUP_FILE..."

if [ "${USE_DOCKER}" = "1" ]; then
  CONTAINER="${DOCKER_CONTAINER:-chioma-postgres-production}"
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USERNAME" -d "$DB_NAME" > /dev/null
  else
    docker exec -i "$CONTAINER" psql -U "$DB_USERNAME" -d "$DB_NAME" < "$BACKUP_FILE"
  fi
else
  export PGPASSWORD="${DB_PASSWORD}"
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -q
  else
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -q -f "$BACKUP_FILE"
  fi
  unset PGPASSWORD
fi

echo "✓ Restore completed successfully"
