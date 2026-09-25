# Weekly Backup Checklist

**Project:** Chioma Platform  
**Frequency:** Weekly (Every Monday)  
**Owner:** Database Administrator / Backup Manager  
**Time Commitment:** 1-2 hours

---

## Overview

Weekly checklist ensures backup and recovery capabilities are working end-to-end. Schedule this for a low-traffic period (e.g., Monday morning or weekend).

---

## Week Start Review (Monday Morning)

### 1. Backup Success Summary

Review the entire past week:

- [ ] **All Daily Backups Successful**
  - Command: `aws s3 ls s3://chioma-backups-prod/full/ | grep -E "$(date -d '7 days ago' +%Y%m%d|date -d '6 days ago' +%Y%m%d|date -d '5 days ago' +%Y%m%d|date -d '4 days ago' +%Y%m%d|date -d '3 days ago' +%Y%m%d|date -d '2 days ago' +%Y%m%d|date +%Y%m%d)"`
  - Expected: 7 backup folders, one per day
  - Action: If missing, review failed backup logs

- [ ] **No Critical Errors Last 7 Days**
  - Command: `grep -i error /var/log/chioma/backup-*.log | grep -i critical | wc -l`
  - Expected: 0 critical errors
  - Action: Address any critical errors found

- [ ] **All Incremental Backups Completed**
  - Command: `aws s3 ls s3://chioma-backups-prod/incremental/ | tail -28`
  - Expected: 28 incremental backups (4 per day × 7 days)
  - Action: If missing any, verify they completed

- [ ] **WAL Archiving Continuous**
  - Command: `psql -U chioma -c "SELECT archived_count, failed_count FROM pg_stat_archiver;" | tail -1`
  - Expected: Significant increase from 7 days ago
  - Action: If failed_count > 0, investigate and fix

### 2. Backup Storage Health

Check S3 storage and costs:

- [ ] **S3 Storage Usage**
  - Command: `aws s3api list-objects-v2 --bucket chioma-backups-prod --recursive --query 'Contents[].Size' | jq 'add / 1099511627776'`
  - Expected: < 2 TB total
  - Action if > 2 TB: Review retention policies, clean old backups

- [ ] **S3 Access Verification**
  - Command: `aws s3 ls s3://chioma-backups-prod/ --recursive | wc -l`
  - Expected: Thousands of files accessible
  - Action if error: Verify AWS credentials, check permissions

- [ ] **Backup Encryption Verified**
  - Command: `aws s3api head-object --bucket chioma-backups-prod --key full/$(date +%Y%m%d)_000000/base.tar.gz | jq .ServerSideEncryption`
  - Expected: "AES256"
  - Action if missing: Verify S3 encryption policy enabled

- [ ] **S3 Versioning Active**
  - Command: `aws s3api get-bucket-versioning --bucket chioma-backups-prod | jq .Status`
  - Expected: "Enabled"
  - Action: If not enabled, enable immediately for protection

### 3. Database Health Snapshot

Verify database state:

- [ ] **Database Size Tracking**
  - Command: `psql -U chioma -c "SELECT pg_size_pretty(pg_database_size('chioma'));"`
  - Expected: Consistent with previous week (within ±10%)
  - Action if significantly larger: Investigate data growth

- [ ] **Table Count Verification**
  - Command: `psql -U chioma -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`
  - Expected: Should match documentation (currently ~30 tables)
  - Action: If count changes unexpectedly, investigate

- [ ] **Index Status**
  - Command: `psql -U chioma -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;"`
  - Expected: No missing or duplicate indexes
  - Action: If changed, review with application team

- [ ] **Unused Indexes**
  - Command: `psql -U chioma -c "SELECT schemaname, tablename, indexname FROM pg_stat_user_indexes WHERE idx_scan = 0;"`
  - Expected: Minimal unused indexes (< 5)
  - Action if > 5: Consider dropping unused indexes to improve backup performance

---

## Automated Restore Test (Tuesday)

### Run Weekly Restore Test

This is critical to verify recovery capability:

- [ ] **Download Latest Backup**
  - Command: `BACKUP=$(aws s3 ls s3://chioma-backups-prod/full/ | tail -1 | awk '{print $4}') && aws s3 cp s3://chioma-backups-prod/full/${BACKUP} /tmp/`
  - Expected: Backup downloaded successfully (usually 1-2 GB)
  - Time: 10-30 minutes depending on network

- [ ] **Create Test Database**
  - Command: `psql -U postgres -c "DROP DATABASE IF EXISTS chioma_weekly_test; CREATE DATABASE chioma_weekly_test;"`
  - Expected: Test database created successfully
  - Verify: `psql -U postgres -l | grep weekly_test`

- [ ] **Run Restore Test**
  - Command: `/opt/chioma/scripts/test-restore.sh /tmp/${BACKUP}`
  - Expected: Test completed successfully with no errors
  - Time: 20-40 minutes
  - Output should show:
    - Table count (should be 30+)
    - User count (should match production)
    - Property count (should be significant)

- [ ] **Verify Restored Data Integrity**
  - Commands:
    ```bash
    psql -U postgres -d chioma_weekly_test -c "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;"
    psql -U postgres -d chioma_weekly_test -c "SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL;"
    psql -U postgres -d chioma_weekly_test -c "SELECT COUNT(*) FROM rental_agreements;"
    ```
  - Expected: Row counts match or exceed previous week's test
  - Action if counts drop: Possible data loss detected - escalate

- [ ] **Test Critical Queries**
  - Commands:
    ```bash
    psql -U postgres -d chioma_weekly_test -c "SELECT COUNT(*) FROM rental_agreements WHERE status = 'active';"
    psql -U postgres -d chioma_weekly_test -c "SELECT COUNT(*) FROM escrow WHERE amount > 0;"
    psql -U postgres -d chioma_weekly_test -c "SELECT COUNT(*) FROM disputes WHERE resolution_status IS NULL;"
    ```
  - Expected: All queries return results
  - Action if errors: Check for schema or permission issues

- [ ] **Clean Up Test Database**
  - Command: `psql -U postgres -c "DROP DATABASE chioma_weekly_test;"`
  - Expected: Database dropped successfully
  - Cleanup: `rm -f /tmp/chioma_*.sql.gz`

- [ ] **Document Test Results**

  ```markdown
  ## Weekly Restore Test Report

  Date: [Date]
  Tester: [Name]

  **Backup Used:** [Backup file name]
  **Test Duration:** [X minutes]
  **Result:** ✅ PASS / ❌ FAIL

  **Metrics:**

  - Tables restored: [#]
  - Users: [#]
  - Properties: [#]
  - Agreements: [#]

  **Issues:** [None / describe]
  **Recommendations:** [None / describe]
  ```

---

## Snapshot Backup Verification (Wednesday)

### Verify Weekly Snapshot

Every Wednesday, verify the Sunday snapshot:

- [ ] **Snapshot Exists and is Recent**
  - Command: `aws s3 ls s3://chioma-backups-prod/snapshot/ | tail -3`
  - Expected: Snapshot from most recent Sunday
  - Action if missing: Create snapshot manually: `/opt/chioma/scripts/backup-snapshot.sh`

- [ ] **Snapshot Size Reasonable**
  - Command: `aws s3 ls s3://chioma-backups-prod/snapshot/ | tail -1 | awk '{print $5}'`
  - Expected: 1.5-3 GB (similar to full backup)
  - Action if too small: Investigate

- [ ] **Snapshot Uploaded to Glacier**
  - Command: `aws s3api head-object --bucket chioma-backups-prod --key snapshot/$(ls -t /tmp | grep -m1 snapshot | cut -d. -f1) | jq .StorageClass`
  - Expected: "GLACIER"
  - Action if different: Check S3 lifecycle policy

- [ ] **Snapshot Metadata Valid**
  - Command: `aws s3 cp s3://chioma-backups-prod/snapshot/metadata_$(date -d 'last sunday' +%Y%m%d).json - | jq .`
  - Expected: Valid JSON with backup details
  - Action if missing: Document issue

---

## Monthly Test Preparation (Thursday)

### Schedule Full Recovery Drill

Prepare for next month's full recovery drill:

- [ ] **Select Backup for Monthly Drill**
  - Choose a backup from 2+ weeks ago (not recent)
  - Command: `aws s3 ls s3://chioma-backups-prod/full/ | head -1`
  - Document which backup will be used

- [ ] **Provision Test Environment**
  - Reserve isolated test hardware/VM
  - Ensure adequate disk space (200+ GB)
  - Prepare test database user accounts
  - Set up test network routing

- [ ] **Document Drill Procedure**
  - Create runbook for full recovery
  - Identify critical test scenarios
  - Plan team participation
  - Schedule for early next month (off-hours)

- [ ] **Notify Team**
  - Inform team of upcoming drill
  - Get approvals from stakeholders
  - Document expected downtime (if simulating production)
  - Plan communication strategy

---

## Review and Optimization (Friday)

### End-of-Week Review

Summarize the week and plan improvements:

- [ ] **Backup Performance Analysis**
  - Review backup durations: `grep 'completed' /var/log/chioma/backup-*.log | tail -7`
  - Expected: Full backups < 4 hours, incremental < 2 hours
  - Action: If exceeding, investigate database growth or resource constraints

- [ ] **Cost Review**
  - Calculate weekly S3 costs: `aws ce get-cost-and-usage --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity DAILY --metrics "BlendedCost" --filter file=s3-backups`
  - Expected: Consistent with monthly budget
  - Action: If high, review retention policy or compression

- [ ] **Team Feedback**
  - Gather feedback from on-call engineers
  - Identify pain points or issues
  - Collect improvement suggestions
  - Document for next quarterly review

- [ ] **Documentation Updates**
  - Review and update this checklist if needed
  - Verify links to runbooks are current
  - Update any changed procedures
  - Commit changes to version control

- [ ] **Key Metrics Summary**
  - Calculate and document:
    - Success rate: (Successful backups / Total backups) × 100
    - Average backup duration
    - Total storage used
    - Restore test success rate
    - Any incidents or escalations

- [ ] **Plan Improvements for Next Week**
  - Address any recurring issues
  - Optimize procedures if needed
  - Update automation scripts
  - Schedule training if gaps identified

---

## Weekly Metrics Dashboard

Track these metrics every week:

| Metric                   | Target | This Week | Last Week | Trend |
| ------------------------ | ------ | --------- | --------- | ----- |
| Backup Success Rate      | 100%   | **\_**%   | **\_**%   | ↑ ↓ → |
| Avg Full Backup Duration | < 4h   | **\_**min | **\_**min | ↑ ↓ → |
| Avg Incremental Duration | < 2h   | **\_**min | **\_**min | ↑ ↓ → |
| Restore Test Pass Rate   | 100%   | **\_**%   | **\_**%   | ↑ ↓ → |
| WAL Archive Failures     | 0      | **\_**    | **\_**    | ↑ ↓ → |
| S3 Storage Used          | < 2 TB | **\_**GB  | **\_**GB  | ↑ ↓ → |

---

## Weekly Sign-Off Checklist

Before completing this week's review:

- [ ] All daily backups successful
- [ ] Restore test completed and passed
- [ ] Snapshot backup verified
- [ ] Monthly drill prepared
- [ ] Performance reviewed
- [ ] Team feedback collected
- [ ] Documentation updated
- [ ] Metrics tracked
- [ ] No blocking issues remain

---

## Troubleshooting Guide

### If Restore Test Failed

1. Verify backup file integrity: `gzip -t /tmp/backup.tar.gz`
2. Check test database creation: `psql -U postgres -l | grep test`
3. Review test script logs: `tail -50 /var/log/chioma/test-restore.log`
4. **Do NOT proceed** if restore fails - investigate immediately

### If Snapshot Missing or Corrupted

1. Check S3 directory: `aws s3 ls s3://chioma-backups-prod/snapshot/`
2. Create new snapshot: `/opt/chioma/scripts/backup-snapshot.sh`
3. Verify upload: `aws s3 ls s3://chioma-backups-prod/snapshot/ | tail -3`
4. Document incident

### If Metrics Show Degradation

1. Identify trend: Which metric is declining?
2. Check database: `psql -U chioma -c "SELECT pg_size_pretty(pg_database_size('chioma'));"`
3. Check resources: `top`, `df -h`, `iostat -x`
4. Review logs: `tail -100 /var/log/chioma/backup-full.log`
5. Escalate if unable to resolve

---

## Weekly Sign-Off

```
DBA/Manager: ________________________
Date: ________________________
All checks completed? ☐ Yes ☐ No

Issues found: ☐ None ☐ Yes (attached incident report)
Escalation needed? ☐ No ☐ Yes (see notes)

Notes:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## Next Steps

- ✅ Complete all checks and tests
- ✅ Document any issues found
- ✅ Update metrics spreadsheet
- ✅ Notify team of status
- ✅ Plan next week's activities
- ✅ Archive this checklist

**Checklist updated:** April 2026  
**Review frequency:** Quarterly (with Backup Manager)
