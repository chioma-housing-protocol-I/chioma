#!/bin/bash
# Backup Verification Script
# Finds the latest backup, optionally restores to a temporary database,
# and validates schema integrity.
#
# Usage:
#   ./scripts/verify-backup.sh              # Full restore + validation
#   BACKUP_VERIFY_METADATA_ONLY=true ./scripts/verify-backup.sh
#
# Environment:
#   BACKUP_DIR                  Backup directory (default: /var/backups/chioma)
#   BACKUP_VERIFY_METADATA_ONLY When "true", only checks file presence and gzip integrity
#   DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD  PostgreSQL connection

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/chioma}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
METADATA_ONLY="${BACKUP_VERIFY_METADATA_ONLY:-false}"

usage() {
  cat <<'EOF'
Chioma backup verification

  ./scripts/verify-backup.sh
      Full verification: restore latest backup to a temp DB and query schema.

  BACKUP_VERIFY_METADATA_ONLY=true ./scripts/verify-backup.sh
      Lightweight check: confirm latest backup exists and gzip is valid.

Environment:
  BACKUP_DIR, DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD
  BACKUP_VERIFY_METADATA_ONLY=true|false
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

echo "Starting backup verification (metadata_only=${METADATA_ONLY})..."

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -n 1 || true)

if [[ -z "$LATEST_BACKUP" ]]; then
  echo "Error: No backup files found in $BACKUP_DIR"
  exit 1
fi

echo "Found latest backup: $LATEST_BACKUP"

if [[ ! -r "$LATEST_BACKUP" ]]; then
  echo "Error: Backup file is not readable: $LATEST_BACKUP"
  exit 1
fi

echo "Checking gzip integrity..."
if ! gunzip -t "$LATEST_BACKUP"; then
  echo "Error: Backup file failed gzip integrity check"
  exit 1
fi

BACKUP_SIZE=$(stat -c%s "$LATEST_BACKUP" 2>/dev/null || stat -f%z "$LATEST_BACKUP")
if [[ "$BACKUP_SIZE" -lt 1024 ]]; then
  echo "Error: Backup file is suspiciously small (${BACKUP_SIZE} bytes)"
  exit 1
fi

echo "Backup metadata OK (size=${BACKUP_SIZE} bytes)"

if [[ "$METADATA_ONLY" == "true" ]]; then
  echo "✓ Metadata-only backup verification completed successfully"
  exit 0
fi

TEMP_DB="chioma_verify_$(date +%s)"

if [[ -n "${DB_PASSWORD:-}" ]]; then
  export PGPASSWORD="${DB_PASSWORD}"
fi

if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" > /dev/null 2>&1; then
  echo "Error: PostgreSQL is not reachable at $DB_HOST:$DB_PORT"
  exit 1
fi

echo "Creating temporary database: $TEMP_DB"
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$TEMP_DB"

cleanup() {
  echo "Cleaning up..."
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$TEMP_DB" > /dev/null 2>&1 || true
  unset PGPASSWORD
}
trap cleanup EXIT

echo "Restoring backup to temporary database..."
gunzip -c "$LATEST_BACKUP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEMP_DB" -v ON_ERROR_STOP=1 -q

echo "Running validation queries..."
USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEMP_DB" -t -c 'SELECT COUNT(*) FROM "user"' 2>/dev/null || echo "ERROR")

if [[ "$USER_COUNT" == "ERROR" ]]; then
  echo "Error: Could not query the user table. Schema may be corrupted or missing."
  exit 1
fi

USER_COUNT=$(echo "$USER_COUNT" | xargs)
echo "Validation successful. Found ${USER_COUNT} users in the backup."
echo "✓ Full backup verification completed successfully"

exit 0
