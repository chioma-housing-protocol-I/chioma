#!/bin/bash
# Database Backup Script
# Uses DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME from env (or .env).
# Optional: BACKUP_DIR (default /var/backups/chioma), RETENTION_DAYS (default 30),
#           MONTHLY_RETENTION_DAYS (default 365), MONTHLY_BACKUP_DAY (default 01).
# For Docker: set USE_DOCKER=1 and DOCKER_CONTAINER=chioma-postgres-production.
#
# Retention policy (self-hosted deployments; AWS uses infrastructure/modules/backup):
#   - daily snapshot      → $BACKUP_DIR/backup_*.sql.gz, kept RETENTION_DAYS (30)
#   - monthly snapshot    → $BACKUP_DIR/monthly/, taken on MONTHLY_BACKUP_DAY,
#                           kept MONTHLY_RETENTION_DAYS (365)
#   - weekly restore test → scripts/test-backup-restore.sh
#
# Cron (UTC):
#   0 2 * * *  /opt/chioma/backend/scripts/backup-db.sh >> /var/log/chioma-backup.log 2>&1
#   0 5 * * 0  /opt/chioma/backend/scripts/test-backup-restore.sh >> /var/log/chioma-restore-test.log 2>&1

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/chioma}"
MONTHLY_DIR="$BACKUP_DIR/monthly"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MONTHLY_RETENTION_DAYS="${MONTHLY_RETENTION_DAYS:-365}"
MONTHLY_BACKUP_DAY="${MONTHLY_BACKUP_DAY:-01}"
TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_NAME="${DB_NAME:-chioma_db}"

mkdir -p "$BACKUP_DIR" "$MONTHLY_DIR"
echo "Starting database backup..."

if [ "${USE_DOCKER}" = "1" ]; then
  CONTAINER="${DOCKER_CONTAINER:-chioma-postgres-production}"
  docker exec "$CONTAINER" pg_dump -U "$DB_USERNAME" "$DB_NAME" > "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
else
  export PGPASSWORD="${DB_PASSWORD}"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$DB_NAME" -F p -f "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
  unset PGPASSWORD
fi

gzip "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"
ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest_db_backup.sql.gz"
echo "✓ Backup created: backup_${TIMESTAMP}.sql.gz"

# Keep the first backup of each month for the long-term (1 year) tier.
if [ "$(date -u +%d)" = "$MONTHLY_BACKUP_DAY" ]; then
  cp "$BACKUP_FILE" "$MONTHLY_DIR/backup_${TIMESTAMP}.sql.gz"
  echo "✓ Monthly backup stored: monthly/backup_${TIMESTAMP}.sql.gz"
fi

find "$BACKUP_DIR" -maxdepth 1 -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$MONTHLY_DIR" -maxdepth 1 -name "backup_*.sql.gz" -mtime +$MONTHLY_RETENTION_DAYS -delete 2>/dev/null || true
echo "✓ Backup completed successfully"
