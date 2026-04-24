# Database Recovery Runbook

**Project:** Chioma Platform  
**Version:** 1.0  
**Last Updated:** April 2026  
**Owner:** Database Administrator / On-Call Engineer  
**Classification:** Internal — Confidential

---

## Overview

This runbook provides step-by-step procedures for recovering from common database failure scenarios. Each scenario includes decision trees, detailed procedures, and troubleshooting steps.

**For detailed information:** See [BACKUP_AND_RECOVERY.md](../BACKUP_AND_RECOVERY.md)  
**Quick reference:** See [BACKUP_AND_RECOVERY_OVERVIEW.md](../BACKUP_AND_RECOVERY_OVERVIEW.md)

---

## Quick Decision Tree

```
Database Problem Detected
    ↓
Is database accessible?
    ├─→ YES: Data appears intact?
    │    ├─→ YES: Performance issue → Skip recovery, see troubleshooting
    │    └─→ NO: Data corruption → SCENARIO 2: Full Backup Restore
    │
    └─→ NO: Complete loss / Unreachable
         ├─→ Single table affected?
         │    └─→ YES: SCENARIO 1: Partial Table Recovery
         │
         └─→ Entire database affected?
              ├─→ Recent change? (< 1 hour)
              │    └─→ YES: SCENARIO 1A: Point-in-Time Recovery (PITR)
              │
              └─→ Older issue? (> 1 hour)
                   ├─→ < 24 hours?
                   │    └─→ YES: SCENARIO 2: Full Backup Restore
                   │
                   └─→ > 24 hours?
                        └─→ SCENARIO 3: Disaster Recovery
```

---

## Scenario 1: Accidental Table Deletion

**Situation:** A table was accidentally dropped (e.g., `DROP TABLE users;`)  
**Severity:** 🔴 Critical  
**RTO:** 1 hour  
**RPO:** 5 minutes  
**Complexity:** Medium

### Quick Steps (5 minutes)

```bash
# 1. STOP - Don't do anything else that might write to DB
systemctl stop chioma-backend

# 2. Identify when deletion occurred
DELETION_TIME="2024-03-30 14:30:00"

# 3. Run PITR recovery
/opt/chioma/scripts/recover-pitr.sh "$DELETION_TIME" "s3://chioma-backups-prod/full/[latest_backup]"

# 4. Verify recovery
psql -U chioma -c "SELECT COUNT(*) FROM users;"

# 5. Restart application
systemctl start chioma-backend

# 6. Monitor logs
tail -f /var/log/chioma/application.log
```

### Detailed Procedure

#### Step 1: Assess the Situation (5 minutes)

```bash
# 1a. Confirm table is deleted
psql -U chioma -d postgres -c "\dt users"
# If no output, table is gone

# 1b. Check database logs for deletion time
tail -100 /var/log/postgresql/postgresql.log | grep DROP

# 1c. Estimate data loss impact
psql -U chioma -c "SELECT COUNT(*) FROM properties;"  # May fail if linked table gone

# 1d. Stop writes to prevent further damage
systemctl stop chioma-backend
systemctl stop chioma-cron  # Stop any scheduled jobs
echo "Application stopped at $(date)"
```

#### Step 2: Determine Recovery Target (5 minutes)

```bash
# 2a. Identify exact time of deletion
# Check from:
#   - Application logs: "table deleted by admin"
#   - User report: "I notice table is gone since 2:30 PM"
#   - Database logs: "DROP TABLE" command timestamp

DELETION_TIME="2024-03-30 14:30:00"
# Format: YYYY-MM-DD HH:MM:SS

# 2b. Calculate recovery point (5 minutes before deletion)
RECOVERY_TIME=$(date -u -d "$DELETION_TIME - 5 minutes" '+%Y-%m-%d %H:%M:%S')
echo "Will recover to: $RECOVERY_TIME"

# 2c. Verify WAL archives available
aws s3 ls s3://chioma-backups-prod/wal/ | tail -20
# Should see WAL files around the deletion time
```

#### Step 3: Prepare for PITR (10 minutes)

```bash
# 3a. Stop PostgreSQL cleanly
systemctl stop postgresql
echo "PostgreSQL stopped at $(date)"

# 3b. Verify data directory can be cleared
du -sh /var/lib/postgresql/data
# Should have enough free space to clear and restore

# 3c. Get latest full backup
BACKUP_DATE=$(aws s3 ls s3://chioma-backups-prod/full/ | tail -1 | awk '{print $4}')
echo "Using backup from: $BACKUP_DATE"

# 3d. Download backup locally (optional, for speed)
mkdir -p /backups/recovery
aws s3 cp s3://chioma-backups-prod/full/${BACKUP_DATE}/ /backups/recovery/ --recursive
echo "Backup prepared for recovery"
```

#### Step 4: Execute Point-in-Time Recovery (60 minutes)

```bash
# 4a. Clear data directory
rm -rf /var/lib/postgresql/data/*
echo "Data directory cleared"

# 4b. Extract base backup
tar -xzf /backups/recovery/base.tar.gz -C /var/lib/postgresql/data/
echo "Base backup extracted"

# 4c. Create recovery configuration
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'aws s3 cp s3://chioma-backups-prod/wal/%f %p'
recovery_target_time = '${RECOVERY_TIME}'
recovery_target_action = 'promote'
EOF
echo "Recovery configuration created"

# 4d. Set correct permissions
chown -R postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data

# 4e. Start PostgreSQL in recovery mode
systemctl start postgresql
echo "PostgreSQL started in recovery mode at $(date)"

# 4f. Monitor recovery progress (usually 10-30 minutes)
tail -f /var/log/postgresql/postgresql.log | grep -i "recovery\|restored\|complete"
# Wait for "database system is ready to accept connections" message
```

#### Step 5: Verify Recovery (10 minutes)

```bash
# 5a. Wait for recovery to complete (watch logs)
# Expected message: "database system is ready to accept connections"

# 5b. Connect to database
psql -U chioma -d postgres

# 5c. Verify deleted table is restored
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM properties;

# 5d. Quick data validation
SELECT DISTINCT role FROM users;  -- Should show multiple roles
SELECT DISTINCT status FROM rental_agreements;  -- Should show multiple statuses

# 5e. Check for corruption
REINDEX DATABASE chioma;  -- Takes 2-5 minutes
ANALYZE;  -- Updates statistics

# 5f. Exit psql
\q
```

#### Step 6: Restart Application (5 minutes)

```bash
# 6a. Start application services
systemctl start chioma-backend
systemctl start chioma-cron
echo "Application started at $(date)"

# 6b. Monitor application logs
tail -50 /var/log/chioma/application.log | grep -i error

# 6c. Test basic connectivity
curl -s http://localhost:3000/health | jq .

# 6d. Verify application can query recovered table
curl -s http://localhost:3000/api/users?limit=1 | jq '.data[0]'
```

#### Step 7: Post-Recovery Steps (15 minutes)

```bash
# 7a. Send notification to stakeholders
echo "Database recovery completed successfully at $(date)" | \
  mail -s "Database Recovery Complete - Deleted Table Restored" \
  operations@chioma.dev

# 7b. Create incident report
cat > /var/log/chioma/incident_$(date +%Y%m%d_%H%M%S).log << EOF
INCIDENT: Accidental Table Deletion

TIMELINE:
- Deletion detected: $(date)
- Recovery started: [time]
- Recovery completed: [time]
- Total downtime: [X minutes]

ROOT CAUSE: [Describe how deletion happened]

IMPACT: [How many users affected, how long service down]

PREVENTIVE MEASURES: [What to prevent in future]
  - Implement role-based access control for DROP commands
  - Require confirmation for destructive operations
  - Add audit trail for schema changes

EOF

# 7c. Document recovery for audit trail
aws s3 cp /var/log/chioma/incident_*.log s3://chioma-backups-prod/incidents/

# 7d. Schedule post-incident review (within 24 hours)
echo "Schedule post-incident review for tomorrow at 10 AM"

# 7e. Verify backup is still working
/opt/chioma/scripts/verify-backup.sh
```

### Troubleshooting

#### "WAL files not found for recovery target"

**Symptom:** Recovery fails with error about missing WAL files

```bash
# Check available WAL files
aws s3 ls s3://chioma-backups-prod/wal/ | grep $(date +%Y%m%d)

# Check recovery logs
tail -20 /var/log/postgresql/postgresql.log | grep WAL

# Solutions:
# 1. Recovery target is too old (> 7 days) - use full restore instead
# 2. WAL archiving was not active at time - accept data loss, restore from full backup
```

#### "PostgreSQL won't start after recovery.conf created"

**Symptom:** PostgreSQL fails to start with recovery configuration

```bash
# Check logs for specific error
tail -50 /var/log/postgresql/postgresql.log

# Verify recovery.conf syntax
cat /var/lib/postgresql/data/recovery.conf

# Common issue: Missing quotes around recovery_target_time
# Fix: recovery_target_time = '2024-03-30 14:25:00'

# Retry startup
systemctl stop postgresql
systemctl start postgresql
```

#### "Recovered data is older than expected"

**Symptom:** Recovered table has older data than expected

```bash
# Check recovery target time in logs
grep "recovery target time" /var/log/postgresql/postgresql.log

# Verify you used correct time
echo "Expected recovery time: $RECOVERY_TIME"

# If incorrect, must retry from start:
# 1. Stop PostgreSQL
# 2. Clear data directory
# 3. Extract backup again
# 4. Use correct recovery.conf
# 5. Restart PostgreSQL
```

---

## Scenario 1A: Point-in-Time Recovery (Recent Data Loss)

**Situation:** Need to recover database to specific point in time (deletion < 1 hour ago)  
**Severity:** 🔴 Critical  
**RTO:** 1-2 hours  
**RPO:** As precise as needed (WAL provides minute/second precision)  
**Complexity:** Medium-High

### When to Use PITR

- ✅ Data deleted < 7 days ago (WAL archives retained)
- ✅ Need precise recovery point (specific time/transaction)
- ✅ Minimal data loss needed
- ✅ Can accept recovery downtime

### When NOT to Use PITR

- ❌ Database corruption (PITR will recover corruption too)
- ❌ WAL archives older than retention (use full restore)
- ❌ Application-level data issues (requires manual fix)

### Quick Steps

```bash
# 1. Determine recovery target (exact timestamp needed)
RECOVERY_TIME="2024-03-30 14:30:00"  # Exact time before issue

# 2. Stop writes to database
systemctl stop chioma-backend

# 3. Stop PostgreSQL
systemctl stop postgresql

# 4. Clear data directory and extract backup
rm -rf /var/lib/postgresql/data/*
tar -xzf /backups/recovery/base.tar.gz -C /var/lib/postgresql/data/

# 5. Create recovery.conf with target time
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'aws s3 cp s3://chioma-backups-prod/wal/%f %p'
recovery_target_time = '${RECOVERY_TIME}'
recovery_target_action = 'promote'
EOF

# 6. Start PostgreSQL (recovery mode)
systemctl start postgresql

# 7. Wait for recovery to complete (watch logs)
tail -f /var/log/postgresql/postgresql.log | grep -i "complete\|ready"

# 8. Verify recovery point
psql -U chioma -c "SELECT EXTRACT(EPOCH FROM pg_postmaster_start_time()) as start_time;"

# 9. Restart application
systemctl start chioma-backend
```

### Detailed Verification

```bash
# Verify the recovery point achieved
psql -U chioma -c \
  "SELECT last_wal_receive_lsn, last_wal_replay_lsn, latest_end_lsn
   FROM pg_stat_replication;"

# Check for data integrity
psql -U chioma << EOF
-- Check table counts
SELECT 'users' as table, COUNT(*) FROM users
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'rental_agreements', COUNT(*) FROM rental_agreements;

-- Check for recent changes (should be before recovery time)
SELECT MAX(created_at) as latest_created FROM users;
SELECT MAX(updated_at) as latest_updated FROM properties;
EOF

# Run REINDEX and ANALYZE
psql -U chioma -c "REINDEX DATABASE chioma; ANALYZE;"
```

---

## Scenario 2: Database Corruption / Full Backup Restore

**Situation:** Database is corrupted, unreachable, or shows data inconsistencies  
**Severity:** 🔴 Critical  
**RTO:** 2-4 hours  
**RPO:** 24 hours (from daily backup)  
**Complexity:** Medium

### Quick Steps (15 minutes)

```bash
# 1. Stop application to prevent further corruption
systemctl stop chioma-backend

# 2. Download latest known-good backup
BACKUP=$(aws s3 ls s3://chioma-backups-prod/full/ | tail -1 | awk '{print $4}')
aws s3 cp s3://chioma-backups-prod/full/${BACKUP}/ /backups/recovery/ --recursive

# 3. Stop PostgreSQL
systemctl stop postgresql

# 4. Create new database
psql -U postgres -c "DROP DATABASE IF EXISTS chioma; CREATE DATABASE chioma;"

# 5. Restore backup
pg_restore -h localhost -U postgres -d chioma --clean --if-exists /backups/recovery/chioma_*.sql.gz

# 6. Start PostgreSQL and verify
systemctl start postgresql
psql -U chioma -c "SELECT COUNT(*) FROM users;"

# 7. Restart application
systemctl start chioma-backend
```

### Detailed Procedure

#### Step 1: Assess Corruption (10 minutes)

```bash
# 1a. Attempt connection
psql -U chioma -d postgres
# If connection fails, database is unreachable

# 1b. If connected, check for obvious corruption
psql -U chioma << EOF
-- Check for missing tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5;

-- Check for data anomalies
SELECT COUNT(*) FROM users;
SELECT MIN(created_at), MAX(created_at) FROM users;

-- Check for index issues
REINDEX DATABASE chioma;

-- Check for constraint violations
SELECT * FROM information_schema.constraint_column_usage LIMIT 5;
EOF

# 1c. Review PostgreSQL error logs
tail -50 /var/log/postgresql/postgresql.log | grep -i "error\|corrupt\|fatal"

# 1d. Document findings
echo "Corruption assessment:
- Database accessible: YES/NO
- Error pattern: [describe]
- Tables affected: [list]
- Time detected: $(date)
" > /tmp/corruption_report.txt
```

#### Step 2: Stop All Writes (5 minutes)

```bash
# 2a. Stop application immediately
systemctl stop chioma-backend
echo "Application stopped at $(date)"

# 2b. Stop any background jobs
systemctl stop chioma-cron
systemctl stop chioma-scheduled-tasks

# 2c. Stop automated backups to prevent including corruption
systemctl stop chioma-backup-service
# Or manually kill backup process
killall pg_basebackup pg_dump

# 2d. Prevent remote connections
# Option: Use iptables to block new DB connections
#iptables -A INPUT -p tcp --dport 5432 -j DROP

# 2e. Notify team
echo "⚠️  Database corruption detected - recovery in progress" | \
  mail -s "URGENT: Database Recovery in Progress" team@chioma.dev
```

#### Step 3: Download Latest Backup (5-15 minutes)

```bash
# 3a. Identify latest backup before corruption was introduced
# Usually use most recent daily backup
LATEST_BACKUP=$(aws s3 ls s3://chioma-backups-prod/full/ | tail -1 | awk '{print $4}')
echo "Latest backup: $LATEST_BACKUP"

# 3b. Check backup metadata
aws s3 cp s3://chioma-backups-prod/full/${LATEST_BACKUP}/metadata.json - | jq .

# 3c. Download backup to local storage
mkdir -p /backups/recovery/${LATEST_BACKUP}
echo "Downloading backup (this may take 20-60 minutes)..."
time aws s3 cp s3://chioma-backups-prod/full/${LATEST_BACKUP}/ \
  /backups/recovery/${LATEST_BACKUP}/ \
  --recursive \
  --no-progress 2>&1 | tee /tmp/download.log

# 3d. Verify download integrity
echo "Verifying backup integrity..."
gzip -t /backups/recovery/${LATEST_BACKUP}/base.tar.gz
echo "Download verified"

# 3e. Record download completion
echo "Backup download completed at $(date)" >> /tmp/download.log
```

#### Step 4: Drop Corrupted Database (5 minutes)

```bash
# 4a. Stop PostgreSQL
systemctl stop postgresql
echo "PostgreSQL stopped at $(date)"

# 4b. Backup corrupted data directory (for investigation)
if [ -d /var/lib/postgresql/data ]; then
  tar czf /backups/corrupted_data_$(date +%Y%m%d_%H%M%S).tar.gz /var/lib/postgresql/data
  echo "Corrupted data backed up for forensics"
fi

# 4c. Remove corrupted data directory
rm -rf /var/lib/postgresql/data/*
echo "Corrupted data directory cleared"

# 4d. Create fresh data directory
mkdir -p /var/lib/postgresql/data
chown postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data
echo "Fresh data directory created"
```

#### Step 5: Restore Backup (60-120 minutes)

```bash
# 5a. Extract base backup
echo "Extracting base backup..."
time tar -xzf /backups/recovery/${LATEST_BACKUP}/base.tar.gz \
  -C /var/lib/postgresql/data
echo "Base backup extracted at $(date)"

# 5b. Verify extraction
ls -lah /var/lib/postgresql/data/
# Should show postgresql.conf, pg_wal, base directory, etc.

# 5c. Fix permissions
chown -R postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data
echo "Permissions set correctly"

# 5d. Start PostgreSQL
echo "Starting PostgreSQL..."
systemctl start postgresql
echo "PostgreSQL started at $(date)"

# 5e. Wait for PostgreSQL to finish recovery (if applicable)
sleep 10
systemctl status postgresql

# 5f. Verify database is accessible
psql -U postgres -c "SELECT 1;"
echo "Database is accessible"
```

#### Step 6: Verify Restored Data (15 minutes)

```bash
# 6a. Check database integrity
psql -U chioma << EOF
-- Run integrity checks
REINDEX DATABASE chioma;
ANALYZE;

-- Check table counts
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'rental_agreements', COUNT(*) FROM rental_agreements
UNION ALL
SELECT 'escrow', COUNT(*) FROM escrow
UNION ALL
SELECT 'disputes', COUNT(*) FROM disputes
ORDER BY table_name;

-- Check data freshness (max last updated timestamp)
SELECT 'Last update' as metric, MAX(updated_at)::text as value FROM users
UNION ALL
SELECT 'Last payment', MAX(created_at)::text FROM payments;

-- Verify no constraint violations (this may take time on large table)
ALTER TABLE rental_agreements VALIDATE CONSTRAINT fk_property;
ALTER TABLE escrow VALIDATE CONSTRAINT fk_agreement;

-- Check for orphaned records
SELECT COUNT(*) as orphaned_escrows FROM escrow e
  WHERE NOT EXISTS (SELECT 1 FROM rental_agreements a WHERE a.id = e.agreement_id);
EOF

# 6b. If data looks good
echo "✅ Data verified successfully"

# 6c. If issues found
echo "❌ Data integrity issues found - investigate before restart"
# Review CONSTRAINT VALIDATION errors
# May need to manually fix data or restore from older backup
```

#### Step 7: Restart Application (5 minutes)

```bash
# 7a. Start application
systemctl start chioma-backend
echo "Application started at $(date)"

# 7b. Start background jobs
systemctl start chioma-cron
systemctl start chioma-scheduled-tasks

# 7c. Monitor startup
sleep 5
tail -50 /var/log/chioma/application.log | grep -E "ERROR|WARN|startup"

# 7d. Health check
curl -s http://localhost:3000/health | jq .status
# Expected: "healthy" or "ok"

# 7e. Test critical functionality
curl -s "http://localhost:3000/api/properties?limit=1" | jq '.data | length'
# Expected: 1 (or more if database has data)
```

#### Step 8: Post-Recovery Steps (30 minutes)

```bash
# 8a. Create incident documentation
cat > /var/log/chioma/recovery_report_$(date +%Y%m%d_%H%M%S).md << EOF
# Database Corruption Recovery Report

## Timeline
- Corruption detected: [timestamp]
- Recovery started: [timestamp]
- Recovery completed: [timestamp]
- Total downtime: [X hours Y minutes]

## Root Cause
[How did corruption happen?]

## Impact
- Users affected: [count]
- Transactions lost: [count]
- Data loss: [X records]

## Recovery Metrics
- Backup age: [X hours]
- Recovery time: [X hours]
- Verification time: [X minutes]
- Data integrity: [OK/Issues]

## Preventive Measures
[What changes to prevent future?]

EOF

# 8b. Notify stakeholders
mail -s "Database Recovery Complete - Status Update" \
  -a "Content-Type: text/markdown" \
  operations@chioma.dev < /var/log/chioma/recovery_report_*.md

# 8c. Archive corrupted database for forensics
# Storage location for investigation
echo "Corrupted database backed up at /backups/corrupted_data_*.tar.gz"

# 8d. Restart automated backups
systemctl start chioma-backup-service

# 8e. Verify backup is working
/opt/chioma/scripts/verify-backup.sh

# 8f. Schedule post-incident review (24 hours)
echo "Schedule incident review for tomorrow"

# 8g. Check that daily backups resume normally
watch 'aws s3 ls s3://chioma-backups-prod/full/ | tail -3'
```

### Troubleshooting Full Restore

#### "pg_restore: error: could not open input file"

**Symptom:** Backup file not found or corrupted

```bash
# Check file exists
ls -lh /backups/recovery/chioma_*.sql.gz

# Verify file integrity
gzip -t /backups/recovery/chioma_*.sql.gz

# If corrupted, re-download
aws s3 cp s3://chioma-backups-prod/full/${LATEST_BACKUP}/ /backups/recovery/ --recursive
```

#### "pg_restore: error: foreign key constraint violations"

**Symptom:** Restored data violates foreign keys

```bash
# This usually means backup was made mid-transaction or with incomplete data

# Option 1: Use --disable-triggers during restore
pg_restore ... --disable-triggers --data-only

# Option 2: Restore to different database first
pg_restore ... -d chioma_test  # Test restore

# Option 3: Manually fix constraint violations
psql -U chioma << EOF
-- Identify orphaned records
SELECT * FROM escrow e WHERE NOT EXISTS (
  SELECT 1 FROM rental_agreements a WHERE a.id = e.agreement_id
);

-- Option 1: Delete orphaned records
DELETE FROM escrow WHERE agreement_id NOT IN (SELECT id FROM rental_agreements);

-- Option 2: Restore parent records
-- Manually recreate missing parent records
EOF
```

#### "Restore takes too long (> 4 hours)"

**Symptom:** Restore is taking longer than expected

```bash
# Check current progress
watch 'ps aux | grep pg_restore'

# Monitor I/O
iostat -x 1 | head -20

# If system is slow:
# 1. Check disk I/O is not maxed out
# 2. Check CPU usage
# 3. Check RAM usage

# To speed up restore:
# 1. Disable indices during restore
# 2. Disable constraints during restore
# 3. Use --jobs option for parallel restore

pg_restore \
  -h localhost -U postgres -d chioma \
  --jobs=4 \
  /backups/recovery/chioma_*.sql.gz
```

---

## Scenario 3: Complete Infrastructure Loss (Disaster Recovery)

**Situation:** Entire database server lost, need to recover on new infrastructure  
**Severity:** 🔴 Critical / 🟠 Severe  
**RTO:** 4-8 hours  
**RPO:** 7 days (snapshot backup)  
**Complexity:** High

### Quick Steps (Simplified)

```bash
# 1. Provision new PostgreSQL server
# - New VM or cloud instance
# - Install PostgreSQL, configure access

# 2. Download latest snapshot backup
aws s3 cp s3://chioma-backups-prod/snapshot/$(aws s3 ls s3://chioma-backups-prod/snapshot/ | tail -1 | awk '{print $4}') /tmp/

# 3. Restore snapshot
gunzip /tmp/chioma_snapshot_*.sql.gz
psql -U postgres -f /tmp/chioma_snapshot_*.sql

# 4. Apply WAL archives (if available)
# For each WAL file after snapshot:
#   pg_restore with recovery.conf

# 5. Deploy application
# Point to new database server

# 6. Verify and test
# Test critical flows
```

### Detailed Procedure

See [BACKUP_AND_RECOVERY.md Section 5.5: Disaster Recovery](../BACKUP_AND_RECOVERY.md#55-disaster-recovery) for complete procedure.

---

## Scenario 4: Partial Data Recovery (Single Table/Records)

**Situation:** Single table corrupted or deleted, other data intact  
**Severity:** 🟠 High  
**RTO:** 30 minutes  
**RPO:** Specific to table  
**Complexity:** Low-Medium

### Quick Steps

```bash
# 1. Identify the table to recover
TABLE_NAME="users"  # Or whichever table is corrupted

# 2. Create recovery backup (before restoring)
pg_dump -U chioma -d chioma -t ${TABLE_NAME} > /tmp/${TABLE_NAME}_current.sql

# 3. Get backup with correct table
BACKUP="s3://chioma-backups-prod/full/20240330_000000"

# 4. Download backup
aws s3 cp ${BACKUP}/ /backups/recovery/ --recursive

# 5. Restore specific table to test database
pg_restore -U postgres -d chioma_test -t ${TABLE_NAME} /backups/recovery/chioma_*.sql.gz

# 6. Verify recovered table
psql -U postgres -d chioma_test -c "SELECT COUNT(*) FROM ${TABLE_NAME};"

# 7. Replace corrupted table (Option A: Rename, restore, replace)
psql -U chioma << EOF
-- Backup current corrupted table
ALTER TABLE ${TABLE_NAME} RENAME TO ${TABLE_NAME}_corrupted;

-- Restore clean table from recovery database
\copy (SELECT * FROM chioma_test.${TABLE_NAME}) TO /tmp/${TABLE_NAME}_clean.sql

-- Import clean table into production
DROP TABLE IF EXISTS ${TABLE_NAME};
\copy ${TABLE_NAME} FROM /tmp/${TABLE_NAME}_clean.sql

-- If needed, drop corrupted backup
DROP TABLE ${TABLE_NAME}_corrupted;
EOF

# 8. Verify
psql -U chioma -c "SELECT COUNT(*) FROM ${TABLE_NAME};"

# 9. Restart application
systemctl restart chioma-backend
```

### Alternative: Restore Using PITR

```bash
# If using point-in-time recovery for single table:

# 1. Recover to temp database at specific time
psql -U postgres -c "CREATE DATABASE chioma_pitr_temp;"

# 2. Restore from PITR backup
recover-pitr.sh "2024-03-30 14:25:00" s3://backup/full/latest

# 3. Export recovered table
pg_dump -U postgres -d chioma_pitr_temp -t ${TABLE_NAME} > /tmp/${TABLE_NAME}_recovered.sql

# 4. Import into production
psql -U postgres -d chioma < /tmp/${TABLE_NAME}_recovered.sql

# 5. Drop temp database
psql -U postgres -c "DROP DATABASE chioma_pitr_temp;"
```

---

## Scenario 5: Replication Lag / Standby Behind

**Situation:** Replication lag is high, standby is significantly behind primary  
**Severity:** 🟡 Medium  
**RTO:** N/A (not a full restore scenario)  
**RPO:** Monitor lag  
**Complexity:** Low

### Quick Steps

```bash
# 1. Check replication status on primary
psql -U chioma -c "SELECT * FROM pg_stat_replication;"

# 2. Check lag
psql -U chioma -c "SELECT
  client_addr,
  state,
  write_lag,
  flush_lag,
  replay_lag
FROM pg_stat_replication;"

# 3. If lag increasing
#   - Check network connectivity: ping replica_ip
#   - Check replica disk space: ssh replica "df -h"
#   - Check replica load: ssh replica "top"
#   - Restart replication if stuck: pg_ctl restart

# 4. Monitor recovery
watch 'psql -U chioma -c "SELECT now() - pg_last_wal_receive_lsn() as lag;"'
# Should decrease over time
```

---

## Common Error Messages and Solutions

### "Connection refused"

```bash
# PostgreSQL service not running
systemctl start postgresql
systemctl status postgresql

# Check if process is listening
netstat -tlnp | grep 5432
# Should show "LISTEN"

# If still not working, check logs
tail -50 /var/log/postgresql/postgresql.log | grep -i error
```

### "FATAL: role 'chioma' does not exist"

```bash
# User doesn't exist
psql -U postgres -c "CREATE USER chioma WITH PASSWORD 'password';"
psql -U postgres -c "ALTER ROLE chioma WITH SUPERUSER;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE chioma TO chioma;"
```

### "permission denied for schema public"

```bash
# Grant permissions to user
psql -U postgres << EOF
GRANT ALL PRIVILEGES ON SCHEMA public TO chioma;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chioma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO chioma;
EOF
```

### "disk space exhausted"

```bash
# Free up space
du -sh /* | sort -h | tail -20  # Find large directories

# Clean old backups
find /backups -mtime +30 -delete

# Clean logs
find /var/log -mtime +30 -delete

# Expand disk if possible
# (Cloud: Add volume; Physical: Add disk)
```

---

## Recovery Checklists

### Pre-Recovery Checklist

- [ ] Have backup file downloaded/accessible
- [ ] Have recovery scripts tested
- [ ] Have team notified
- [ ] Have stakeholders informed
- [ ] Have communication channel open
- [ ] Have documentation available
- [ ] Have estimated RTO/RPO reviewed
- [ ] Have read-only copy of current data (if investigating)

### During Recovery Checklist

- [ ] Monitor recovery progress constantly
- [ ] Maintain communication with team/stakeholders
- [ ] Document timing and issues
- [ ] Take screenshots/logs for post-mortem
- [ ] Have backup plan if recovery fails
- [ ] Monitor system resources (CPU, disk, memory)
- [ ] Be prepared to stop and retry if needed

### Post-Recovery Checklist

- [ ] Verify data integrity thoroughly
- [ ] Test critical business functions
- [ ] Restart all services
- [ ] Monitor application logs for errors
- [ ] Send status update to stakeholders
- [ ] Create incident report
- [ ] Archive logs and corrupted data
- [ ] Schedule post-incident review
- [ ] Update documentation if needed
- [ ] Verify automated backups resume

---

## When to Escalate

🚨 **Escalate Immediately If:**

- Recovery is taking longer than estimated RTO
- Recovery encounters unexpected errors not in runbook
- Data integrity issues found that can't be resolved
- Multiple tables corrupted (not isolated issue)
- Unable to restore from backup (backup corrupted)
- Network issues preventing S3 access
- System running out of disk space mid-recovery

**Escalation contacts:**

1. On-call database manager: [Phone]
2. Infrastructure lead: [Phone]
3. CTO: [For business decisions]

---

## Recovery Testing

It's critical to test recovery procedures regularly. See:

- [Weekly Backup Checklist](../checklists/WEEKLY_BACKUP_CHECKLIST.md) - Automated restore tests
- [Monthly Backup Checklist](../checklists/MONTHLY_BACKUP_CHECKLIST.md) - Full recovery drills
- [Quarterly Backup Checklist](../checklists/QUARTERLY_BACKUP_CHECKLIST.md) - Disaster recovery simulation

---

## References

- **Full Backup & Recovery Guide:** [BACKUP_AND_RECOVERY.md](../BACKUP_AND_RECOVERY.md)
- **Quick Reference:** [BACKUP_AND_RECOVERY_OVERVIEW.md](../BACKUP_AND_RECOVERY_OVERVIEW.md)
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/current/backup.html
- **Monitoring & Alerting:** [MONITORING_AND_ALERTING.md](../MONITORING_AND_ALERTING.md)
- **Incident Response:** [INCIDENT_RESPONSE.md](../../INCIDENT_RESPONSE.md)

---

**Last Updated:** April 2026  
**Next Review:** July 2026
