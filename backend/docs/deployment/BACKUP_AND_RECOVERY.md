# Database Backup and Recovery

**Comprehensive Guide to Database Backup and Disaster Recovery**

This document defines backup and recovery procedures for the Chioma backend database, covering backup strategies, verification, recovery procedures, testing, and retention policies.

## Quick Links

**New to backup and recovery?** Start here:

- ⚡ [Quick Reference / Overview](./BACKUP_AND_RECOVERY_OVERVIEW.md) - Start here for quick reference
- 🚀 [Recovery Runbook](./runbooks/RECOVERY_RUNBOOK.md) - Step-by-step procedures for common recovery scenarios

**Checklists by frequency:**

- 📋 [Daily Checklist](./checklists/DAILY_BACKUP_CHECKLIST.md) - Run every day
- 📋 [Weekly Checklist](./checklists/WEEKLY_BACKUP_CHECKLIST.md) - Run every Monday
- 📋 [Monthly Checklist](./checklists/MONTHLY_BACKUP_CHECKLIST.md) - Run monthly with full recovery drill
- 📋 [Quarterly Checklist](./checklists/QUARTERLY_BACKUP_CHECKLIST.md) - Run quarterly with disaster recovery simulation

**Related documentation:**

- [Deployment Runbook](./DEPLOYMENT.md)
- [Production Setup](./PRODUCTION_SETUP.md)
- [Monitoring and Alerting](./MONITORING_AND_ALERTING.md)
- [Incident Response](../../INCIDENT_RESPONSE.md)
- [Disaster Recovery Plan](./DISASTER_RECOVERY_PLAN.md)

---

## 1. Overview

Database backup and recovery procedures ensure:

- data durability and protection against loss
- rapid recovery from failures or corruption
- compliance with data retention requirements
- disaster recovery capability

This document is written for database administrators, operators, and on-call engineers responsible for data integrity.

---

## 2. Backup Strategy

### 2.1 Backup Types

Chioma uses a multi-layered backup strategy:

| Backup Type              | Frequency          | Retention | Purpose                          |
| ------------------------ | ------------------ | --------- | -------------------------------- |
| Continuous WAL archiving | Real-time          | 7 days    | Point-in-time recovery (PITR)    |
| Full backup              | Daily              | 30 days   | Complete database restore        |
| Incremental backup       | Every 6 hours      | 7 days    | Faster recovery, reduced storage |
| Snapshot backup          | Weekly             | 90 days   | Long-term retention, compliance  |
| Pre-deployment backup    | Before each deploy | 7 days    | Rollback safety                  |

### 2.2 Backup Scope

Production backups include:

- all application databases
- database schema and structure
- user accounts and permissions
- configuration files
- encryption keys (stored separately)

Excluded from backups:

- temporary tables
- cache tables
- session data
- logs (backed up separately)

### 2.3 Backup Storage

Backup storage requirements:

- geographically separate from primary database
- encrypted at rest
- access-controlled (least privilege)
- versioned to prevent accidental deletion
- monitored for integrity

Recommended storage:

- AWS S3 with versioning and lifecycle policies
- Azure Blob Storage with immutable storage
- Google Cloud Storage with retention policies
- Self-hosted with replication to secondary site

### 2.4 Backup Encryption

All backups must be encrypted:

- encryption at rest using AES-256
- encryption in transit using TLS 1.2+
- separate encryption keys per environment
- key rotation every 90 days
- keys stored in secure key management system (AWS KMS, HashiCorp Vault)

### 2.5 Backup Retention Policy

| Environment | Full Backup | Incremental | WAL Archive | Snapshot |
| ----------- | ----------- | ----------- | ----------- | -------- |
| Development | 7 days      | 3 days      | 3 days      | None     |
| Staging     | 14 days     | 7 days      | 7 days      | 30 days  |
| Production  | 30 days     | 7 days      | 7 days      | 90 days  |

Compliance retention:

- financial transaction data: 7 years
- user account data: per GDPR/CCPA requirements
- audit logs: 1 year minimum

---

## 3. Backup Procedures

### 3.1 Continuous WAL Archiving

PostgreSQL Write-Ahead Log (WAL) archiving enables point-in-time recovery.

Configuration in `postgresql.conf`:

```conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://chioma-backups-prod/wal/%f'
archive_timeout = 300
```

Verify WAL archiving:

```bash
# Check archive status
docker exec postgres psql -U chioma -c "SELECT archived_count, failed_count FROM pg_stat_archiver;"

# List recent WAL files
aws s3 ls s3://chioma-backups-prod/wal/ --recursive | tail -20
```

### 3.2 Full Backup Procedure

Full backup using `pg_basebackup`:

```bash
#!/bin/bash
# backup-full.sh

set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/full/${BACKUP_DATE}"
S3_BUCKET="s3://chioma-backups-prod/full"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Perform base backup
pg_basebackup \
  -h localhost \
  -U backup_user \
  -D "${BACKUP_DIR}" \
  -Ft \
  -z \
  -P \
  -X stream

# Upload to S3
aws s3 sync "${BACKUP_DIR}" "${S3_BUCKET}/${BACKUP_DATE}/" \
  --storage-class STANDARD_IA \
  --sse AES256

# Verify upload
aws s3 ls "${S3_BUCKET}/${BACKUP_DATE}/"

# Create backup metadata
cat > "${BACKUP_DIR}/metadata.json" <<EOF
{
  "backup_date": "${BACKUP_DATE}",
  "backup_type": "full",
  "database_version": "$(psql -U chioma -t -c 'SELECT version();')",
  "database_size": "$(psql -U chioma -t -c 'SELECT pg_size_pretty(pg_database_size(current_database()));')",
  "backup_size": "$(du -sh ${BACKUP_DIR} | cut -f1)"
}
EOF

# Upload metadata
aws s3 cp "${BACKUP_DIR}/metadata.json" "${S3_BUCKET}/${BACKUP_DATE}/metadata.json"

# Clean up local backup after 24 hours
find /backups/full -type d -mtime +1 -exec rm -rf {} +

echo "Full backup completed: ${BACKUP_DATE}"
```

Schedule via cron:

```cron
# Daily full backup at 2 AM
0 2 * * * /opt/chioma/scripts/backup-full.sh >> /var/log/chioma/backup-full.log 2>&1
```

### 3.3 Incremental Backup Procedure

Incremental backup using `pg_dump`:

```bash
#!/bin/bash
# backup-incremental.sh

set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/incremental/chioma_${BACKUP_DATE}.sql.gz"
S3_BUCKET="s3://chioma-backups-prod/incremental"

# Perform incremental dump
pg_dump \
  -h localhost \
  -U backup_user \
  -d chioma \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_FILE}"

# Upload to S3
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/" \
  --storage-class STANDARD_IA \
  --sse AES256

# Verify upload
aws s3 ls "${S3_BUCKET}/chioma_${BACKUP_DATE}.sql.gz"

# Clean up local backup after 24 hours
find /backups/incremental -type f -mtime +1 -delete

echo "Incremental backup completed: ${BACKUP_DATE}"
```

Schedule via cron:

```cron
# Incremental backup every 6 hours
0 */6 * * * /opt/chioma/scripts/backup-incremental.sh >> /var/log/chioma/backup-incremental.log 2>&1
```

### 3.4 Pre-Deployment Backup

Before every production deployment:

```bash
#!/bin/bash
# backup-pre-deploy.sh

set -euo pipefail

DEPLOYMENT_ID="${1:-unknown}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/pre-deploy/chioma_pre_deploy_${DEPLOYMENT_ID}_${BACKUP_DATE}.sql.gz"
S3_BUCKET="s3://chioma-backups-prod/pre-deploy"

echo "Creating pre-deployment backup for deployment: ${DEPLOYMENT_ID}"

# Perform backup
pg_dump \
  -h localhost \
  -U backup_user \
  -d chioma \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_FILE}"

# Upload to S3
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/" \
  --storage-class STANDARD \
  --sse AES256 \
  --metadata "deployment_id=${DEPLOYMENT_ID},backup_date=${BACKUP_DATE}"

# Verify upload
aws s3 ls "${S3_BUCKET}/chioma_pre_deploy_${DEPLOYMENT_ID}_${BACKUP_DATE}.sql.gz"

echo "Pre-deployment backup completed: ${BACKUP_FILE}"
echo "Deployment can proceed"
```

Integrate into deployment workflow:

```yaml
# .github/workflows/deploy-production.yml
- name: Create pre-deployment backup
  run: |
    ./scripts/backup-pre-deploy.sh ${{ github.run_id }}
```

### 3.5 Snapshot Backup

Weekly snapshot for long-term retention:

```bash
#!/bin/bash
# backup-snapshot.sh

set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/snapshot/${BACKUP_DATE}"
S3_BUCKET="s3://chioma-backups-prod/snapshot"

# Create snapshot directory
mkdir -p "${BACKUP_DIR}"

# Full database dump
pg_dumpall \
  -h localhost \
  -U postgres \
  --file="${BACKUP_DIR}/chioma_snapshot_${BACKUP_DATE}.sql"

# Compress
gzip "${BACKUP_DIR}/chioma_snapshot_${BACKUP_DATE}.sql"

# Upload to S3 with Glacier transition
aws s3 cp "${BACKUP_DIR}/chioma_snapshot_${BACKUP_DATE}.sql.gz" \
  "${S3_BUCKET}/" \
  --storage-class GLACIER \
  --sse AES256

# Create snapshot metadata
cat > "${BACKUP_DIR}/metadata.json" <<EOF
{
  "snapshot_date": "${BACKUP_DATE}",
  "database_version": "$(psql -U chioma -t -c 'SELECT version();')",
  "total_size": "$(du -sh ${BACKUP_DIR} | cut -f1)",
  "retention_policy": "90 days"
}
EOF

aws s3 cp "${BACKUP_DIR}/metadata.json" "${S3_BUCKET}/metadata_${BACKUP_DATE}.json"

# Clean up local snapshot
rm -rf "${BACKUP_DIR}"

echo "Snapshot backup completed: ${BACKUP_DATE}"
```

Schedule via cron:

```cron
# Weekly snapshot on Sunday at 3 AM
0 3 * * 0 /opt/chioma/scripts/backup-snapshot.sh >> /var/log/chioma/backup-snapshot.log 2>&1
```

---

## 4. Backup Verification

### 4.1 Verification Strategy

All backups must be verified:

- immediately after creation
- weekly automated restore test
- monthly full recovery drill

### 4.2 Immediate Verification

Verify backup integrity after creation:

```bash
#!/bin/bash
# verify-backup.sh

set -euo pipefail

BACKUP_FILE="${1}"

echo "Verifying backup: ${BACKUP_FILE}"

# Check file exists and is not empty
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file is empty or does not exist"
  exit 1
fi

# Verify compression integrity
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  if ! gzip -t "${BACKUP_FILE}"; then
    echo "ERROR: Backup file is corrupted"
    exit 1
  fi
fi

# Verify PostgreSQL custom format
if [[ "${BACKUP_FILE}" == *.sql.gz ]]; then
  if ! pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1; then
    echo "ERROR: Backup file is not a valid PostgreSQL dump"
    exit 1
  fi
fi

# Check backup size is reasonable (>1MB for production)
BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")
if [ "${BACKUP_SIZE}" -lt 1048576 ]; then
  echo "WARNING: Backup file is suspiciously small (${BACKUP_SIZE} bytes)"
fi

echo "Backup verification passed: ${BACKUP_FILE}"
```

### 4.3 Automated Restore Test

Weekly automated restore to test environment:

```bash
#!/bin/bash
# test-restore.sh

set -euo pipefail

BACKUP_FILE="${1}"
TEST_DB="chioma_restore_test"

echo "Testing restore from: ${BACKUP_FILE}"

# Create test database
psql -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};"
psql -U postgres -c "CREATE DATABASE ${TEST_DB};"

# Restore backup
pg_restore \
  -h localhost \
  -U postgres \
  -d "${TEST_DB}" \
  --no-owner \
  --no-acl \
  "${BACKUP_FILE}"

# Verify critical tables exist
TABLES=$(psql -U postgres -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

if [ "${TABLES}" -lt 10 ]; then
  echo "ERROR: Restore test failed - insufficient tables"
  exit 1
fi

# Verify data integrity
USER_COUNT=$(psql -U postgres -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM users;")
PROPERTY_COUNT=$(psql -U postgres -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM properties;")

echo "Restore test passed:"
echo "  Tables: ${TABLES}"
echo "  Users: ${USER_COUNT}"
echo "  Properties: ${PROPERTY_COUNT}"

# Clean up test database
psql -U postgres -c "DROP DATABASE ${TEST_DB};"
```

Schedule via cron:

```cron
# Weekly restore test on Saturday at 4 AM
0 4 * * 6 /opt/chioma/scripts/test-restore.sh $(aws s3 ls s3://chioma-backups-prod/full/ | tail -1 | awk '{print $4}') >> /var/log/chioma/test-restore.log 2>&1
```

### 4.4 Backup Monitoring

Monitor backup health:

```yaml
# prometheus alert for backup failures
- alert: BackupFailed
  expr: |
    time() - backup_last_success_timestamp_seconds > 86400
  for: 1h
  labels:
    severity: high
  annotations:
    summary: 'Database backup has not succeeded in 24 hours'
    description: 'Last successful backup: {{ $value | humanizeDuration }}'
    runbook: 'https://docs.chioma.io/runbooks/backup-failed'
```

Backup metrics to expose:

- `backup_last_success_timestamp_seconds`
- `backup_duration_seconds`
- `backup_size_bytes`
- `backup_verification_status`

---

## 5. Recovery Procedures

### 5.1 Recovery Scenarios

| Scenario                 | Recovery Method          | RTO     | RPO       |
| ------------------------ | ------------------------ | ------- | --------- |
| Accidental data deletion | Point-in-time recovery   | 1 hour  | 5 minutes |
| Database corruption      | Full backup restore      | 2 hours | 24 hours  |
| Complete data loss       | Full backup + WAL replay | 4 hours | 5 minutes |
| Disaster recovery        | Snapshot restore         | 8 hours | 7 days    |

RTO: Recovery Time Objective (maximum acceptable downtime)
RPO: Recovery Point Objective (maximum acceptable data loss)

### 5.2 Point-in-Time Recovery (PITR)

Recover to specific timestamp using WAL archives:

```bash
#!/bin/bash
# recover-pitr.sh

set -euo pipefail

TARGET_TIME="${1}"  # Format: 2024-03-30 14:30:00
BACKUP_DIR="/backups/recovery"
BASE_BACKUP="${2}"  # Path to base backup

echo "Starting point-in-time recovery to: ${TARGET_TIME}"

# Stop PostgreSQL
systemctl stop postgresql

# Clear data directory
rm -rf /var/lib/postgresql/data/*

# Extract base backup
tar -xzf "${BASE_BACKUP}" -C /var/lib/postgresql/data/

# Create recovery configuration
cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'aws s3 cp s3://chioma-backups-prod/wal/%f %p'
recovery_target_time = '${TARGET_TIME}'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL in recovery mode
systemctl start postgresql

# Monitor recovery progress
tail -f /var/log/postgresql/postgresql.log | grep -i recovery

echo "Point-in-time recovery initiated"
echo "Monitor logs for completion"
```

### 5.3 Full Backup Restore

Restore from full backup:

```bash
#!/bin/bash
# recover-full.sh

set -euo pipefail

BACKUP_FILE="${1}"
TARGET_DB="${2:-chioma}"

echo "Starting full restore from: ${BACKUP_FILE}"

# Create database if not exists
psql -U postgres -c "CREATE DATABASE ${TARGET_DB};" || true

# Restore backup
pg_restore \
  -h localhost \
  -U postgres \
  -d "${TARGET_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --verbose \
  "${BACKUP_FILE}"

# Verify restore
echo "Verifying restore..."
psql -U postgres -d "${TARGET_DB}" -c "SELECT COUNT(*) FROM users;"
psql -U postgres -d "${TARGET_DB}" -c "SELECT COUNT(*) FROM properties;"

echo "Full restore completed"
```

### 5.4 Incremental Restore

Restore from incremental backup:

```bash
#!/bin/bash
# recover-incremental.sh

set -euo pipefail

BACKUP_FILE="${1}"
TARGET_DB="${2:-chioma}"

echo "Starting incremental restore from: ${BACKUP_FILE}"

# Restore incremental backup
pg_restore \
  -h localhost \
  -U postgres \
  -d "${TARGET_DB}" \
  --data-only \
  --disable-triggers \
  --verbose \
  "${BACKUP_FILE}"

# Re-enable triggers
psql -U postgres -d "${TARGET_DB}" -c "ALTER TABLE ALL ENABLE TRIGGER ALL;"

# Refresh materialized views if any
psql -U postgres -d "${TARGET_DB}" -c "REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS mv_property_stats;"

echo "Incremental restore completed"
```

### 5.5 Disaster Recovery

Complete disaster recovery procedure:

1. Provision new infrastructure
2. Install PostgreSQL
3. Download latest snapshot backup
4. Restore snapshot
5. Apply WAL archives if available
6. Verify data integrity
7. Update application configuration
8. Redirect traffic

```bash
#!/bin/bash
# disaster-recovery.sh

set -euo pipefail

echo "Starting disaster recovery procedure"

# Download latest snapshot
LATEST_SNAPSHOT=$(aws s3 ls s3://chioma-backups-prod/snapshot/ | tail -1 | awk '{print $4}')
aws s3 cp "s3://chioma-backups-prod/snapshot/${LATEST_SNAPSHOT}" /tmp/

# Extract and restore
gunzip "/tmp/${LATEST_SNAPSHOT}"
psql -U postgres -f "/tmp/${LATEST_SNAPSHOT%.gz}"

# Download and apply WAL archives
mkdir -p /var/lib/postgresql/wal_archive
aws s3 sync s3://chioma-backups-prod/wal/ /var/lib/postgresql/wal_archive/

# Configure recovery
cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_timeline = 'latest'
recovery_target_action = 'promote'
EOF

# Start recovery
systemctl restart postgresql

echo "Disaster recovery initiated"
echo "Monitor logs for completion"
```

### 5.6 Partial Data Recovery

Recover specific tables or data:

```bash
#!/bin/bash
# recover-partial.sh

set -euo pipefail

BACKUP_FILE="${1}"
TABLE_NAME="${2}"
TARGET_DB="${3:-chioma}"

echo "Recovering table: ${TABLE_NAME}"

# Restore specific table
pg_restore \
  -h localhost \
  -U postgres \
  -d "${TARGET_DB}" \
  --table="${TABLE_NAME}" \
  --data-only \
  --verbose \
  "${BACKUP_FILE}"

echo "Partial recovery completed for table: ${TABLE_NAME}"
```

---

## 6. Backup Testing

### 6.1 Testing Strategy

Regular backup testing ensures recoverability:

- weekly: automated restore test
- monthly: full recovery drill
- quarterly: disaster recovery simulation

### 6.2 Weekly Automated Test

Automated restore test (see section 4.3):

- restore latest backup to test database
- verify table count
- verify row counts
- verify data integrity
- alert on failure

### 6.3 Monthly Recovery Drill

Full recovery drill procedure:

1. Select random backup from last 30 days
2. Provision isolated test environment
3. Perform full restore
4. Verify application functionality
5. Test critical user flows
6. Measure recovery time
7. Document results and issues

Drill checklist:

- [ ] Backup selected and downloaded
- [ ] Test environment provisioned
- [ ] Database restored successfully
- [ ] Application connected to restored database
- [ ] User authentication working
- [ ] Property listing retrieval working
- [ ] Rental agreement creation working
- [ ] Recovery time documented
- [ ] Issues documented and addressed

### 6.4 Quarterly Disaster Recovery Simulation

Full disaster recovery simulation:

1. Simulate complete infrastructure loss
2. Provision new infrastructure from scratch
3. Restore from snapshot backup
4. Apply WAL archives
5. Reconfigure application
6. Redirect traffic
7. Verify full functionality
8. Measure total recovery time
9. Update disaster recovery plan

Simulation checklist:

- [ ] Infrastructure provisioned
- [ ] Database restored
- [ ] Application deployed
- [ ] Configuration updated
- [ ] DNS updated
- [ ] TLS certificates installed
- [ ] Monitoring configured
- [ ] Full functionality verified
- [ ] Recovery time documented
- [ ] Lessons learned documented

### 6.5 Test Documentation

Document all backup tests:

```markdown
# Backup Test Report

Date: 2024-03-30
Test Type: Monthly Recovery Drill
Tester: [Name]

## Test Details

- Backup Date: 2024-03-25
- Backup Type: Full
- Backup Size: 2.3 GB
- Test Environment: staging-test

## Results

- Restore Duration: 15 minutes
- Verification Duration: 10 minutes
- Total Recovery Time: 25 minutes

## Verification

- [x] Database restored successfully
- [x] Table count matches expected
- [x] Row counts within acceptable range
- [x] Application connects successfully
- [x] User authentication works
- [x] Critical flows tested

## Issues

- None

## Recommendations

- None

## Sign-off

Tester: [Name]
Date: 2024-03-30
```

---

## 7. Backup Retention

### 7.1 Retention Policy

Automated retention management:

```bash
#!/bin/bash
# cleanup-old-backups.sh

set -euo pipefail

S3_BUCKET="s3://chioma-backups-prod"

echo "Cleaning up old backups"

# Delete full backups older than 30 days
aws s3 ls "${S3_BUCKET}/full/" | \
  awk '{print $4}' | \
  while read -r backup; do
    BACKUP_DATE=$(echo "${backup}" | grep -oE '[0-9]{8}')
    DAYS_OLD=$(( ($(date +%s) - $(date -d "${BACKUP_DATE}" +%s)) / 86400 ))
    if [ "${DAYS_OLD}" -gt 30 ]; then
      echo "Deleting old full backup: ${backup}"
      aws s3 rm "${S3_BUCKET}/full/${backup}" --recursive
    fi
  done

# Delete incremental backups older than 7 days
aws s3 ls "${S3_BUCKET}/incremental/" | \
  awk '{print $4}' | \
  while read -r backup; do
    BACKUP_DATE=$(echo "${backup}" | grep -oE '[0-9]{8}')
    DAYS_OLD=$(( ($(date +%s) - $(date -d "${BACKUP_DATE}" +%s)) / 86400 ))
    if [ "${DAYS_OLD}" -gt 7 ]; then
      echo "Deleting old incremental backup: ${backup}"
      aws s3 rm "${S3_BUCKET}/incremental/${backup}"
    fi
  done

# Delete WAL archives older than 7 days
aws s3 ls "${S3_BUCKET}/wal/" | \
  awk '{print $4}' | \
  while read -r wal; do
    WAL_DATE=$(aws s3api head-object --bucket chioma-backups-prod --key "wal/${wal}" --query 'LastModified' --output text)
    DAYS_OLD=$(( ($(date +%s) - $(date -d "${WAL_DATE}" +%s)) / 86400 ))
    if [ "${DAYS_OLD}" -gt 7 ]; then
      echo "Deleting old WAL archive: ${wal}"
      aws s3 rm "${S3_BUCKET}/wal/${wal}"
    fi
  done

echo "Backup cleanup completed"
```

Schedule via cron:

```cron
# Daily cleanup at 5 AM
0 5 * * * /opt/chioma/scripts/cleanup-old-backups.sh >> /var/log/chioma/cleanup-backups.log 2>&1
```

### 7.2 S3 Lifecycle Policies

Automate retention with S3 lifecycle rules:

```json
{
  "Rules": [
    {
      "Id": "full-backup-retention",
      "Status": "Enabled",
      "Prefix": "full/",
      "Expiration": {
        "Days": 30
      }
    },
    {
      "Id": "incremental-backup-retention",
      "Status": "Enabled",
      "Prefix": "incremental/",
      "Expiration": {
        "Days": 7
      }
    },
    {
      "Id": "wal-archive-retention",
      "Status": "Enabled",
      "Prefix": "wal/",
      "Expiration": {
        "Days": 7
      }
    },
    {
      "Id": "snapshot-glacier-transition",
      "Status": "Enabled",
      "Prefix": "snapshot/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

---

## 8. Backup Checklist

Pre-backup:

- [ ] Backup scripts tested and validated
- [ ] Backup storage provisioned and accessible
- [ ] Encryption keys configured
- [ ] Backup user permissions configured
- [ ] Monitoring and alerting configured
- [ ] Retention policies defined
- [ ] Recovery procedures documented

Daily:

- [ ] Verify full backup completed
- [ ] Verify incremental backups completed
- [ ] Verify WAL archiving active
- [ ] Check backup storage usage
- [ ] Review backup logs for errors
- [ ] Verify backup uploads to S3

Weekly:

- [ ] Run automated restore test
- [ ] Verify snapshot backup completed
- [ ] Review backup metrics
- [ ] Test backup download speed
- [ ] Verify encryption keys accessible

Monthly:

- [ ] Conduct full recovery drill
- [ ] Review and update retention policies
- [ ] Audit backup access logs
- [ ] Test disaster recovery procedure
- [ ] Update backup documentation

Quarterly:

- [ ] Disaster recovery simulation
- [ ] Review backup strategy
- [ ] Audit backup costs
- [ ] Rotate encryption keys
- [ ] Train team on recovery procedures

---

## 9. Backup Troubleshooting

### 9.1 Backup Fails to Complete

Symptoms:

- backup script exits with error
- backup file not created
- backup not uploaded to S3

Diagnostics:

```bash
# Check backup logs
tail -100 /var/log/chioma/backup-full.log

# Check disk space
df -h /backups

# Check database connectivity
psql -U backup_user -c "SELECT 1;"

# Check S3 access
aws s3 ls s3://chioma-backups-prod/
```

Common causes:

- insufficient disk space
- database connection failure
- S3 credentials expired
- network connectivity issue
- backup user permissions

Solutions:

- free up disk space
- verify database credentials
- rotate S3 credentials
- check network connectivity
- grant necessary permissions

### 9.2 Backup Verification Fails

Symptoms:

- backup file corrupted
- restore test fails
- backup size too small

Diagnostics:

```bash
# Verify file integrity
gzip -t /backups/full/backup.tar.gz

# Check backup contents
pg_restore --list /backups/full/backup.sql.gz

# Compare backup size to database size
psql -U chioma -c "SELECT pg_size_pretty(pg_database_size('chioma'));"
ls -lh /backups/full/backup.sql.gz
```

Common causes:

- backup interrupted
- disk corruption
- insufficient permissions
- database locked during backup

Solutions:

- retry backup
- check disk health
- verify permissions
- schedule backup during low-traffic period

### 9.3 Restore Fails

Symptoms:

- restore command exits with error
- data missing after restore
- application fails to connect

Diagnostics:

```bash
# Check restore logs
pg_restore --verbose /backups/full/backup.sql.gz 2>&1 | tee restore.log

# Verify database exists
psql -U postgres -l

# Check table count
psql -U postgres -d chioma -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Check for errors
grep ERROR restore.log
```

Common causes:

- incompatible PostgreSQL version
- missing dependencies
- insufficient permissions
- database already exists with conflicts

Solutions:

- use compatible PostgreSQL version
- install required extensions
- grant necessary permissions
- drop existing database before restore

### 9.4 WAL Archiving Fails

Symptoms:

- WAL files not appearing in S3
- archive_command failures in logs
- point-in-time recovery not possible

Diagnostics:

```bash
# Check archive status
psql -U postgres -c "SELECT * FROM pg_stat_archiver;"

# Check PostgreSQL logs
tail -100 /var/log/postgresql/postgresql.log | grep archive

# Test archive command manually
su - postgres -c "aws s3 cp /var/lib/postgresql/data/pg_wal/000000010000000000000001 s3://chioma-backups-prod/wal/"
```

Common causes:

- S3 credentials not available to postgres user
- network connectivity issue
- insufficient S3 permissions
- archive_command syntax error

Solutions:

- configure AWS credentials for postgres user
- verify network connectivity
- grant S3 write permissions
- fix archive_command syntax

---

## 10. References

- [Deployment Runbook](./DEPLOYMENT.md)
- [Production Setup](./PRODUCTION_SETUP.md)
- [Monitoring and Alerting](./MONITORING_AND_ALERTING.md)
- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [AWS S3 Backup Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/backup-best-practices.html)
