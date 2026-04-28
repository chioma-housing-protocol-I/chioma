#!/bin/bash
# Backup Verification Script
# This script finds the latest backup file, restores it to a temporary database,
# and performs a basic validation query to ensure the backup is valid.

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/chioma}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
TEMP_DB="chioma_verify_$(date +%s)"

echo "Starting automated backup verification..."

# 1. Find the latest backup file
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "Error: No backup files found in $BACKUP_DIR"
  exit 1
fi

echo "Found latest backup: $LATEST_BACKUP"

# Export password if needed
if [ -n "$DB_PASSWORD" ]; then
  export PGPASSWORD="${DB_PASSWORD}"
fi

# 2. Check if postgres is reachable
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" > /dev/null 2>&1; then
  echo "Error: PostgreSQL is not reachable at $DB_HOST:$DB_PORT"
  exit 1
fi

# 3. Create a temporary database
echo "Creating temporary database: $TEMP_DB"
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$TEMP_DB"

# Ensure cleanup on exit
cleanup() {
  echo "Cleaning up..."
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$TEMP_DB" > /dev/null 2>&1 || true
  unset PGPASSWORD
}
trap cleanup EXIT

# 4. Restore the backup
echo "Restoring backup to temporary database..."
gunzip -c "$LATEST_BACKUP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEMP_DB" -v ON_ERROR_STOP=1 -q

# 5. Run a validation query
echo "Running validation queries..."
# Try to query the users table (we wrap in single quotes to handle potential schema names or uppercase)
USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$TEMP_DB" -t -c "SELECT COUNT(*) FROM \"user\"" 2>/dev/null || echo "ERROR")

if [ "$USER_COUNT" = "ERROR" ]; then
  echo "Validation failed: Could not query the 'user' table. Schema might be corrupted or missing."
  exit 1
fi

USER_COUNT=$(echo "$USER_COUNT" | xargs) # trim whitespace

echo "Validation successful. Found $USER_COUNT users in the backup."
echo "✓ Backup verification completed successfully"

exit 0
