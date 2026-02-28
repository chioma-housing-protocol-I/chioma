#!/bin/bash

# Database Backup Script

set -e

BACKUP_DIR="/var/backups/chioma"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."

# Backup PostgreSQL
docker exec chioma-postgres-production pg_dump -U $DB_USERNAME $DB_NAME > "$BACKUP_DIR/backup_${TIMESTAMP}.sql"

# Create latest symlink
ln -sf "$BACKUP_DIR/backup_${TIMESTAMP}.sql" "$BACKUP_DIR/latest_db_backup.sql"

# Compress backup
gzip "$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo "✓ Backup created: backup_${TIMESTAMP}.sql.gz"

# Clean old backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✓ Backup completed successfully"
