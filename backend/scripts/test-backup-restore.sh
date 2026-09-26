#!/bin/bash
# Backup Restore Test
# Restores the latest backup to a temporary database and validates the schema.
# Fails with a non-zero exit code if the restore or validation fails.
#
# Usage:
#   ./scripts/test-backup-restore.sh
#
# Environment:
#   BACKUP_DIR, DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/chioma}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -n 1 || true)

if [[ -z "$LATEST_BACKUP" ]]; then
  echo "FAIL: No backup files found in $BACKUP_DIR"
  exit 1
fi

echo "Testing restore of: $LATEST_BACKUP"

# Verify gzip integrity before attempting restore
if ! gunzip -t "$LATEST_BACKUP" 2>/dev/null; then
  echo "FAIL: Backup file failed gzip integrity check"
  exit 1
fi

if [[ -n "${DB_PASSWORD:-}" ]]; then
  export PGPASSWORD="${DB_PASSWORD}"
fi

if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" > /dev/null 2>&1; then
  echo "FAIL: PostgreSQL not reachable at $DB_HOST:$DB_PORT"
  exit 1
fi

TEMP_DB="chioma_restore_test_$(date +%s)"

cleanup() {
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$TEMP_DB" > /dev/null 2>&1 || true
  unset PGPASSWORD 2>/dev/null || true
}
trap cleanup EXIT

createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$TEMP_DB"

echo "Restoring backup..."
if ! gunzip -c "$LATEST_BACKUP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEMP_DB" -v ON_ERROR_STOP=1 -q; then
  echo "FAIL: Restore failed"
  exit 1
fi

echo "Validating schema..."

# Verify core tables exist and are queryable
REQUIRED_TABLES=("users" "properties" "payments")
for TABLE in "${REQUIRED_TABLES[@]}"; do
  COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEMP_DB" -t -c "SELECT COUNT(*) FROM \"$TABLE\"" 2>/dev/null | xargs || echo "ERROR")
  if [[ "$COUNT" == "ERROR" ]]; then
    echo "FAIL: Table '$TABLE' missing or unreadable after restore"
    exit 1
  fi
  echo "  ✓ $TABLE: $COUNT rows"
done

echo "PASS: Backup restore test completed successfully"
exit 0
