#!/bin/bash

# ==============================================================================
# Database Backup Script for Chioma (PostgreSQL)
# ==============================================================================
# This script creates a compressed backup of the chioma_db database running
# inside the 'chioma_db' Docker container. It automatically manages retention
# by deleting backups older than 7 days.
#
# CRON JOB SETUP:
# To run this script automatically every day at 2:00 AM, add the following
# line to your crontab (edit with `crontab -e`):
#
# 0 2 * * * /absolute/path/to/chioma/scripts/backup_db.sh > /absolute/path/to/chioma/backups/backup.log 2>&1
# ==============================================================================

set -e # Exit immediately if a command exits with a non-zero status

# Configuration
CONTAINER_NAME="chioma_db"
DB_USER="postgres_cax"
DB_NAME="chioma_db"
DAYS_TO_KEEP=7

# Paths
# Resolve the directory where this script is located, then go up one level to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Timestamp for the backup file (YYYY-MM-DD_HHMMSS)
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/chioma_db_${TIMESTAMP}.sql.gz"

echo "========================================"
echo "Starting Database Backup: $(date)"
echo "========================================"

# 1. Ensure backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Creating backup directory at $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# 2. Check if the Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: Docker container '${CONTAINER_NAME}' is not running."
    echo "Backup aborted."
    exit 1
fi

# 3. Perform the backup using pg_dump inside the container
echo "Running pg_dump on container '${CONTAINER_NAME}'..."
# We use 'docker exec' to run pg_dump, then pipe output to gzip, redirecting to the host file
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    echo "SUCCESS: Backup created at ${BACKUP_FILE}"
else
    echo "ERROR: Database backup failed!"
    # Ensure partial/corrupt file is removed if failure occurs
    rm -f "$BACKUP_FILE"
    exit 1
fi

# 4. Clean up old backups
echo "Cleaning up backups older than ${DAYS_TO_KEEP} days..."
# Find files matching the backup pattern in the backup dir, older than X days, and delete them
cleanup_count=$(find "$BACKUP_DIR" -maxdepth 1 -name "chioma_db_*.sql.gz" -type f -mtime +${DAYS_TO_KEEP} -delete -print | wc -l)
echo "Deleted ${cleanup_count} old backup file(s)."

echo "========================================"
echo "Backup Process Completed Successfully."
echo "========================================"
