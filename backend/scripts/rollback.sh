#!/bin/bash

# Rollback Script for Quick Recovery

set -e

BACKUP_DIR="/var/backups/chioma"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting rollback procedure..."

# Stop current deployment
echo "Stopping current deployment..."
docker-compose -f docker-compose.production.yml down

# Restore previous database backup
echo "Restoring database backup..."
if [ -f "$BACKUP_DIR/latest_db_backup.sql" ]; then
    docker exec chioma-postgres-production psql -U $DB_USERNAME -d $DB_NAME < "$BACKUP_DIR/latest_db_backup.sql"
    echo "✓ Database restored"
else
    echo "⚠ No database backup found, skipping..."
fi

# Restore previous Docker image
echo "Restoring previous Docker image..."
if [ -f "$BACKUP_DIR/previous_image_tag.txt" ]; then
    PREVIOUS_TAG=$(cat "$BACKUP_DIR/previous_image_tag.txt")
    export DOCKER_IMAGE="$PREVIOUS_TAG"
    echo "✓ Using image: $DOCKER_IMAGE"
else
    echo "⚠ No previous image tag found"
fi

# Start with previous version
echo "Starting previous version..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services
sleep 10

# Health check
echo "Running health check..."
if curl -f http://localhost:3000/health; then
    echo "✓ Rollback successful!"
else
    echo "✗ Rollback failed - manual intervention required"
    exit 1
fi

echo "Rollback completed at $TIMESTAMP"
