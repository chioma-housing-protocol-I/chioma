# Database Backup and Recovery - Quick Reference

**Project:** Chioma Platform
**Version:** 1.0
**Last Updated:** April 2026
**Owner:** Database Administrator
**Classification:** Internal — Confidential

---

## Overview

This document provides a quick reference for database backup and recovery procedures. For detailed information, see [BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md).

---

## Backup Strategy at a Glance

| Backup Type                  | Frequency            | Retention | Storage           | Purpose                          |
| ---------------------------- | -------------------- | --------- | ----------------- | -------------------------------- |
| **Continuous WAL Archiving** | Real-time            | 7 days    | S3 `wal/`         | Point-in-time recovery           |
| **Full Backup**              | Daily (2 AM)         | 30 days   | S3 `full/`        | Complete restore capability      |
| **Incremental Backup**       | Every 6 hours        | 7 days    | S3 `incremental/` | Faster recovery, less storage    |
| **Snapshot Backup**          | Weekly (Sunday 3 AM) | 90 days   | S3 Glacier        | Long-term retention & compliance |
| **Pre-Deploy Backup**        | Before deployment    | 7 days    | S3 `pre-deploy/`  | Rollback safety                  |

---

## Key Commands

### Backup Operations

```bash
# Create full backup
/opt/chioma/scripts/backup-full.sh

# Create incremental backup
/opt/chioma/scripts/backup-incremental.sh

# Create pre-deployment backup
/opt/chioma/scripts/backup-pre-deploy.sh <deployment_id>

# Create snapshot backup
/opt/chioma/scripts/backup-snapshot.sh

# Verify backup integrity
/opt/chioma/scripts/verify-backup.sh <backup_file>

# Test backup restore
/opt/chioma/scripts/test-restore.sh <backup_file>
```

### Recovery Operations

```bash
# Point-in-time recovery (PITR)
/opt/chioma/scripts/recover-pitr.sh "<YYYY-MM-DD HH:MM:SS>" <base_backup_file>

# Full restore from backup
/opt/chioma/scripts/recover-full.sh <backup_file> [target_db]

# Incremental restore
/opt/chioma/scripts/recover-incremental.sh <backup_file> [target_db]

# Disaster recovery (complete)
/opt/chioma/scripts/disaster-recovery.sh

# Partial table recovery
/opt/chioma/scripts/recover-partial.sh <backup_file> <table_name> [target_db]
```

### Monitoring & Cleanup

```bash
# Check WAL archiving status
psql -U chioma -c "SELECT archived_count, failed_count FROM pg_stat_archiver;"

# List recent backups
aws s3 ls s3://chioma-backups-prod/full/ --recursive | tail -20

# Clean up old backups
/opt/chioma/scripts/cleanup-old-backups.sh

# View backup logs
tail -100 /var/log/chioma/backup-full.log
```

---

## Recovery Time Objectives

| Scenario                | Recovery Method        | RTO     | RPO      | Steps   |
| ----------------------- | ---------------------- | ------- | -------- | ------- |
| **Accidental deletion** | Point-in-time recovery | 1 hour  | 5 min    | 3 steps |
| **Database corruption** | Full backup restore    | 2 hours | 24 hours | 4 steps |
| **Complete data loss**  | Full backup + WAL      | 4 hours | 5 min    | 5 steps |
| **Disaster recovery**   | Snapshot restore       | 8 hours | 7 days   | 8 steps |

**RTO** = Recovery Time Objective (max acceptable downtime)  
**RPO** = Recovery Point Objective (max acceptable data loss)

---

## Common Recovery Scenarios

### Scenario 1: Accidental Data Deletion (Table Dropped)

**RTO:** 1 hour | **RPO:** 5 minutes

```bash
# 1. Identify the backup needed
BACKUP_FILE=$(aws s3 ls s3://chioma-backups-prod/full/ | tail -1 | awk '{print $4}')

# 2. Recover to point-in-time (5 minutes ago)
RECOVERY_TIME=$(date -u -d '5 minutes ago' '+%Y-%m-%d %H:%M:%S')
/opt/chioma/scripts/recover-pitr.sh "$RECOVERY_TIME" "$BACKUP_FILE"

# 3. Verify recovery in test database
psql -U postgres -d chioma_restore_test -c "SELECT COUNT(*) FROM <deleted_table>;"
```

### Scenario 2: Database Corruption

**RTO:** 2 hours | **RPO:** 24 hours

```bash
# 1. Stop application
systemctl stop chioma-backend

# 2. Get latest clean backup
BACKUP_FILE=$(aws s3 ls s3://chioma-backups-prod/full/ | grep -v '$(date +%Y%m%d)' | tail -1 | awk '{print $4}')

# 3. Restore full backup
/opt/chioma/scripts/recover-full.sh "s3://chioma-backups-prod/full/$BACKUP_FILE" chioma

# 4. Verify integrity
psql -U chioma -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM properties;"

# 5. Restart application
systemctl start chioma-backend
```

### Scenario 3: Complete Infrastructure Loss (Disaster)

**RTO:** 8 hours | **RPO:** 7 days

```bash
# 1. Run disaster recovery script
/opt/chioma/scripts/disaster-recovery.sh

# 2. Deploy application to new infrastructure
cd /opt/chioma && git pull && ./deploy.sh

# 3. Update DNS/routing
aws route53 change-resource-record-sets ...

# 4. Verify all critical functions
# Login, create agreement, process payment, view properties

# 5. Monitor for issues
tail -f /var/log/chioma/application.log
```

---

## Critical Backup Metrics

Monitor these metrics daily:

- **Last Backup Success Time**: Should be < 24 hours ago
- **Backup Duration**: Should be < 4 hours
- **Backup Size**: Should be 1.5-3 GB (production)
- **Verification Status**: All backups verified
- **S3 Upload Status**: All backups successfully uploaded
- **WAL Archiving**: Active and no failures
- **Restore Test**: Last successful test < 1 week ago

---

## Quick Troubleshooting

| Problem                   | Diagnosis                                                 | Solution                              |
| ------------------------- | --------------------------------------------------------- | ------------------------------------- |
| Backup fails              | Check logs: `tail /var/log/chioma/backup-full.log`        | Free disk space, verify DB connection |
| Restore fails             | Check version compatibility: `psql --version`             | Use matching PostgreSQL version       |
| WAL archiving fails       | Check status: `psql -c "SELECT * FROM pg_stat_archiver;"` | Verify S3 credentials, check network  |
| Backup verification fails | Verify file: `gzip -t backup.tar.gz`                      | Retry backup, check disk health       |

---

## Checklist Quick Links

- **[Daily Checklist](./checklists/DAILY_BACKUP_CHECKLIST.md)** - Run daily
- **[Weekly Checklist](./checklists/WEEKLY_BACKUP_CHECKLIST.md)** - Run weekly
- **[Monthly Checklist](./checklists/MONTHLY_BACKUP_CHECKLIST.md)** - Run monthly
- **[Quarterly Checklist](./checklists/QUARTERLY_BACKUP_CHECKLIST.md)** - Run quarterly

---

## Runbook Quick Links

- **[Recovery Runbook](./runbooks/RECOVERY_RUNBOOK.md)** - Step-by-step recovery procedures
- **[Backup Troubleshooting](./BACKUP_AND_RECOVERY.md#9-backup-troubleshooting)** - Common issues

---

## Emergency Contacts

- **On-call DBA**: See PagerDuty schedule
- **Backup Support**: #database-support (Slack)
- **Escalation**: CTO for business-critical issues

---

## Related Documentation

- **[Full Backup & Recovery Guide](./BACKUP_AND_RECOVERY.md)** - Comprehensive procedures
- **[Disaster Recovery Plan](./DISASTER_RECOVERY_PLAN.md)** - Complete disaster scenario
- **[Production Setup](./PRODUCTION_SETUP.md)** - Environment configuration
- **[Monitoring and Alerting](./MONITORING_AND_ALERTING.md)** - Backup monitoring

---

## Key Retention Policies

| Environment | Full    | Incremental | WAL    | Snapshot |
| ----------- | ------- | ----------- | ------ | -------- |
| Development | 7 days  | 3 days      | 3 days | None     |
| Staging     | 14 days | 7 days      | 7 days | 30 days  |
| Production  | 30 days | 7 days      | 7 days | 90 days  |

**Compliance requirements:**

- Financial transaction data: 7 years
- User account data: Per GDPR/CCPA
- Audit logs: 1 year minimum

---

## Success Criteria

✅ All backups complete daily without errors  
✅ WAL archiving active and working  
✅ Weekly restore tests passing  
✅ Monthly recovery drills successful  
✅ All backup metrics within normal range  
✅ Team trained on recovery procedures  
✅ Documentation up-to-date

---

## Last Updated

**Date:** April 2026  
**By:** Database Administrator  
**Status:** Current and Verified

For updates or questions, see [BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md)
