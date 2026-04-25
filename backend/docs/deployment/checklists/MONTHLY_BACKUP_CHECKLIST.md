# Monthly Backup Checklist

**Project:** Chioma Platform  
**Frequency:** Monthly (First week of month)  
**Owner:** Backup Manager / Database Administrator  
**Time Commitment:** 4-6 hours

---

## Overview

Monthly checklist performs comprehensive backup and recovery testing through a full recovery drill. This is critical to verify that disaster recovery capabilities work end-to-end.

---

## Month Start Preparation (Day 1)

### 1. Review Previous Month Performance

Analyze backup metrics from the past month:

- [ ] **Monthly Backup Success Rate**
  - Calculate: (Successful backups / Total backups scheduled) × 100
  - Target: > 99.5%
  - Command: Count daily logs: `ls -1 /var/log/chioma/backup-full.log.* | wc -l`
  - Action if < 99.5%: Document issues and create improvement plan

- [ ] **Monthly Restore Test Success Rate**
  - Check: Count weekly test reports
  - Target: 100% (all 4 weekly tests passed)
  - Action if < 100%: Investigate failed tests and resolve issues

- [ ] **Average Backup Duration Trend**
  - Calculate: Average of all daily full backup durations
  - Target: < 4 hours
  - Command: `grep 'completed' /var/log/chioma/backup-full.log | grep -oP 'Duration: \K[^s]*' | awk '{sum+=$1; count++} END {print sum/count}'`
  - Action if > 4h: Investigate database growth or resource constraints

- [ ] **WAL Archiving Reliability**
  - Check: `psql -U chioma -c "SELECT archived_count, failed_count FROM pg_stat_archiver;"`
  - Target: Zero failures (failed_count = 0)
  - Action if failures: Document root cause and fix

- [ ] **Storage Costs vs Budget**
  - Obtain AWS bill from previous month
  - Calculate S3 backup costs
  - Target: Within budget
  - Action if over budget: Review retention policies and optimize

- [ ] **Incidents and Escalations**
  - Review incident log for past month
  - Count backup-related incidents
  - Target: Zero critical incidents
  - Action: Document any patterns and create preventive measures

### 2. Team Capacity and Readiness

Ensure team is ready for full recovery drill:

- [ ] **DBA Team Availability**
  - Confirm 2-3 experienced DBAs available for full day
  - Schedule drill for low-traffic day (weekend or holiday)
  - Notify stakeholders of test window
  - Plan 8-10 hours for full drill

- [ ] **Test Environment Readiness**
  - Verify test environment hardware available
  - Ensure adequate disk space: 200+ GB free
  - Test network connectivity to S3
  - Prepare test database user accounts

- [ ] **Stakeholder Approvals**
  - Get approval from DevOps lead
  - Notify infrastructure team
  - Inform application team
  - Document communication channel for during drill

- [ ] **Runbook Updated**
  - Review recovery runbook
  - Update for any changes in environment
  - Verify all scripts are executable
  - Test scripts in staging first

---

## Full Monthly Recovery Drill (Day 2-3)

### Recovery Drill Execution

This is a comprehensive test of complete recovery capability.

#### Phase 1: Pre-Drill Setup (30 minutes)

- [ ] **Final Environment Checks**
  - Verify test hardware ready: `lsblk -h`
  - Verify S3 access: `aws s3 ls s3://chioma-backups-prod/`
  - Verify PostgreSQL available: `psql --version`
  - Verify scripts accessible: `ls -la /opt/chioma/scripts/recover-*.sh`

- [ ] **Select Backup for Recovery**
  - Choose backup from 2+ weeks ago: `aws s3 ls s3://chioma-backups-prod/full/ | grep -v $(date +%Y%m01) | head -1`
  - Document backup name and date
  - Download backup: `aws s3 cp s3://chioma-backups-prod/full/[backup_date]/ /backups/drill/ --recursive`
  - Verify download completed

- [ ] **Initialize Test Database**
  - Create test database user: `psql -U postgres -c "CREATE USER drill_user WITH PASSWORD 'secure_password';"`
  - Create test database: `psql -U postgres -c "CREATE DATABASE chioma_monthly_drill;"`
  - Grant permissions: `psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE chioma_monthly_drill TO drill_user;"`

#### Phase 2: Full Restoration (2-3 hours)

- [ ] **Execute Full Restore**
  - Command: `/opt/chioma/scripts/recover-full.sh /backups/drill/chioma_[date].sql.gz chioma_monthly_drill`
  - Monitor: `tail -f /var/log/chioma/recovery.log`
  - Expected: Restore completes with no errors
  - Duration: 1-2 hours typically
  - Action if fails: Stop, investigate, document issue

- [ ] **Verify Restore Completion**
  - Check table count: `psql -U drill_user -d chioma_monthly_drill -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`
  - Expected: 30+ tables
  - Check data: `psql -U drill_user -d chioma_monthly_drill -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM properties;"`
  - Expected: Significant row counts matching production

- [ ] **Verify Schema Integrity**
  - Check indices: `psql -U drill_user -d chioma_monthly_drill -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"`
  - Check constraints: `psql -U drill_user -d chioma_monthly_drill -c "SELECT COUNT(*) FROM information_schema.table_constraints;"`
  - Check sequences: `psql -U drill_user -d chioma_monthly_drill -c "SELECT COUNT(*) FROM information_schema.sequences;"`
  - All should match production schema

#### Phase 3: Data Integrity Validation (1-2 hours)

Test all critical tables and data relationships:

- [ ] **Users and Accounts**

  ```bash
  psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT COUNT(*) as total_users,
            COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_users,
            COUNT(DISTINCT role) as unique_roles
     FROM users;"
  ```

  - Verify all role types present (admin, landlord, tenant, agent)

- [ ] **Properties**

  ```bash
  psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT COUNT(*) as total_properties,
            COUNT(DISTINCT city) as cities_covered,
            COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified
     FROM properties;"
  ```

  - Verify property distribution across cities

- [ ] **Rental Agreements**

  ```bash
  psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT COUNT(*) as total_agreements,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            SUM(monthly_rent) as total_monthly_rent
     FROM rental_agreements;"
  ```

  - Verify all status types present

- [ ] **Escrow Accounts**

  ```bash
  psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT COUNT(*) as total_escrows,
            SUM(amount) as total_escrow_value,
            COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked,
            COUNT(CASE WHEN status = 'released' THEN 1 END) as released
     FROM escrow;"
  ```

  - Verify escrow balances reasonable

- [ ] **Disputes**

  ```bash
  psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT COUNT(*) as total_disputes,
            COUNT(CASE WHEN resolution_status IS NULL THEN 1 END) as open,
            COUNT(CASE WHEN resolution_status = 'resolved' THEN 1 END) as resolved
     FROM disputes;"
  ```

  - Verify dispute tracking data complete

- [ ] **Audit Logs**
  ```bash
  psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT COUNT(*) as audit_log_entries,
            COUNT(DISTINCT entity_type) as entity_types_tracked,
            MIN(created_at) as oldest_log,
            MAX(created_at) as newest_log
     FROM audit_logs;"
  ```

  - Verify audit trail complete and recent

#### Phase 4: Critical Business Flow Testing (1-2 hours)

Test key application scenarios:

- [ ] **User Authentication Validation**
  - Verify user credentials in restored database
  - Test password hashes retrievable
  - Check role-based access control data
  - Command: `psql -U drill_user -d chioma_monthly_drill -c "SELECT id, email, role FROM users LIMIT 10;"`

- [ ] **Property Listing Data**
  - Verify all property images references intact
  - Check amenity data completeness
  - Validate location coordinates: `SELECT COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) FROM properties;`
  - Verify metadata (bedrooms, bathrooms, etc.)

- [ ] **Financial Data Integrity**
  - Verify payment transaction records
  - Check payment method information
  - Validate transaction amounts and dates
  - Command: `psql -U drill_user -d chioma_monthly_drill -c "SELECT COUNT(*) FROM payments WHERE status = 'completed';"`

- [ ] **Blockchain/Smart Contract Data**
  - If applicable, verify blockchain transaction references
  - Check smart contract addresses stored
  - Verify transaction hashes
  - Command: `psql -U drill_user -d chioma_monthly_drill -c "SELECT COUNT(*) FROM blockchain_transactions;"`

#### Phase 5: Foreign Key and Relationship Validation (30 minutes)

Verify data relationships intact:

- [ ] **Run Foreign Key Check**

  ```bash
  psql -U drill_user -d chioma_monthly_drill << EOF
  -- Check all foreign key relationships
  SELECT DISTINCT
    kcu1.constraint_name,
    kcu1.table_name,
    kcu1.column_name,
    kcu2.table_name as referenced_table,
    kcu2.column_name as referenced_column
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu1 ON rc.constraint_name = kcu1.constraint_name
  JOIN information_schema.key_column_usage kcu2 ON rc.unique_constraint_name = kcu2.constraint_name
  ORDER BY kcu1.table_name;
  EOF
  ```

  - All relationships should be intact
  - No orphaned records (if referential integrity enforced)

- [ ] **Verify Referential Integrity**
  - Check for orphaned property references
  - Check for orphaned agreement references
  - Verify all escrow records linked to agreements
  - Check dispute references valid

#### Phase 6: Performance Baseline (30 minutes)

Test query performance on restored database:

- [ ] **Index Usage Statistics**

  ```bash
  psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
     FROM pg_stat_user_indexes
     ORDER BY idx_scan DESC LIMIT 20;"
  ```

  - Verify critical indexes have scan statistics

- [ ] **Query Performance Sampling**

  ```bash
  # Time critical query
  time psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT COUNT(*) FROM properties WHERE city = 'Lagos' AND status = 'active';"
  ```

  - Expected: Query completes in < 100ms

- [ ] **Full Table Scan Check**
  ```bash
  psql -U drill_user -d chioma_monthly_drill -c \
    "SELECT schemaname, tablename, seq_scan, seq_tup_read
     FROM pg_stat_user_tables
     WHERE seq_scan > 100
     ORDER BY seq_scan DESC;"
  ```

  - Identify queries doing unnecessary full table scans

---

## Post-Drill Analysis (Day 4)

### 1. Recovery Metrics Documentation

Document all recovery metrics:

- [ ] **Overall Recovery Results**

  ```
  Recovery Drill Report
  =====================
  Date: [Drill Date]
  Backup Used: [Backup Filename]
  Backup Age: [Days since backup]
  Test Environment: [Environment Details]

  TIMING METRICS:
  - Setup Time: [X minutes]
  - Restore Duration: [X hours Y minutes]
  - Verification Duration: [X hours Y minutes]
  - Total Recovery Time: [X hours Y minutes]

  ACTUAL vs. ESTIMATED RTO:
  - Estimated RTO: 2-4 hours
  - Actual Recovery Time: [X hours]
  - Variance: [+/- X hours]

  DATA INTEGRITY RESULTS:
  - Tables Restored: [Count]
  - Total Row Count: [Count]
  - Data Validation: ✅ PASS / ⚠️ MINOR ISSUES / ❌ FAILED
  - Schema Validation: ✅ PASS / ⚠️ MINOR ISSUES / ❌ FAILED
  - Referential Integrity: ✅ PASS / ⚠️ MINOR ISSUES / ❌ FAILED

  CRITICAL BUSINESS FLOW TEST RESULTS:
  ✅ User authentication data intact
  ✅ Property data complete
  ✅ Financial data reconciled
  ✅ Blockchain references valid (if applicable)

  ISSUES IDENTIFIED:
  - [Issue 1]: [Description] - [Severity]
  - [Issue 2]: [Description] - [Severity]
  ```

- [ ] **Document Any Issues Found**
  - Severity levels: Critical, High, Medium, Low
  - Root cause analysis for each
  - Recommended remediation
  - Owner assigned for follow-up

- [ ] **Performance Baseline**
  - Document query performance times
  - Compare to production if possible
  - Identify any performance degradation
  - Record baseline for future comparisons

### 2. Team Debrief Session

Schedule 1-hour debrief with team:

- [ ] **What Went Well**
  - Positive observations
  - Smoothly executed procedures
  - Team performance highlights

- [ ] **What Needs Improvement**
  - Challenges encountered
  - Process inefficiencies
  - Skill gaps identified

- [ ] **Action Items**
  - Specific improvements needed
  - Owner assigned to each action
  - Completion timeline
  - Follow-up tracking

- [ ] **Update Documentation**
  - Record lessons learned
  - Update runbooks based on actual experience
  - Simplify procedures if overcomplicated
  - Add clarifications where confusion occurred

### 3. Stakeholder Communication

Update all stakeholders:

- [ ] **Send Recovery Drill Report**
  - To: Management, DevOps, Security
  - Include: Results, issues, metrics
  - Highlight: RTO met/not met, data integrity verified
  - Recommendations: For improvement

- [ ] **Update Status Dashboard**
  - Recovery capability: ✅ VERIFIED
  - Last successful drill: [Date]
  - Next planned drill: [Date]
  - Any open action items

- [ ] **Schedule Next Drill**
  - Set date for next monthly drill
  - Note: One month from completion
  - Add to team calendar
  - Notify participants

---

## Monthly Optimization and Planning (Day 5)

### 1. Analyze Backup Strategy Effectiveness

Review if current strategy is working:

- [ ] **Backup Coverage Assessment**
  - Is current schedule adequate?
  - Are RPO/RTO targets being met?
  - Need for additional backups?
  - Need to reduce backup frequency?

- [ ] **Storage Efficiency Review**
  - Calculate compression ratio: (Uncompressed size / Compressed size)
  - Expected: 10:1 or better
  - If poor: May indicate data already compressed
  - Review for optimization opportunities

- [ ] **Cost vs Benefit Analysis**
  - Calculate monthly backup costs
  - Estimate cost per recovery day
  - Verify ROI (cost of backup vs cost of data loss)
  - Target: Backup cost < 1% of data value

- [ ] **Recovery Capability Assessment**
  - Current RTO: [X hours] (target 2-4 hours)
  - Current RPO: [X minutes] (target < 5 minutes)
  - Gap analysis: Do we meet requirements?
  - If not met: Plan improvements

### 2. Plan Improvements for Next Month

- [ ] **Process Improvements**
  - Any automation opportunities?
  - Reduce manual steps?
  - Improve documentation?
  - Better error handling needed?

- [ ] **Resource Planning**
  - Adequate team capacity for backups?
  - Need for training?
  - Need for additional tools?
  - Budget needs for next quarter?

- [ ] **Risk Assessment**
  - Single point of failure identified?
  - Geographic redundancy adequate?
  - Encryption key management secure?
  - Disaster recovery plan reviewed?

- [ ] **Schedule Updates**
  - Any maintenance windows coming up?
  - Major deployments planned?
  - Database upgrades scheduled?
  - Backup schedule needs adjustment?

### 3. Update Monthly Checklist

- [ ] **Reflect on Checklist Effectiveness**
  - Is this checklist comprehensive?
  - Any critical items missing?
  - Items that don't add value?
  - Timing realistic?

- [ ] **Gather Team Input**
  - Get feedback from DBAs
  - Ask about pain points
  - Suggestions for improvements
  - Record in version control

- [ ] **Update Documentation**
  - Incorporate lessons learned
  - Update procedures based on experience
  - Add new checks if needed
  - Remove outdated items

---

## Monthly Metrics Summary

Track these metrics monthly:

| Metric                | Target | This Month    | Last Month    | Trend |
| --------------------- | ------ | ------------- | ------------- | ----- |
| Backup Success Rate   | >99.5% | **\_**%       | **\_**%       | ↑ ↓ → |
| Recovery Drill Pass   | 100%   | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail |       |
| Actual RTO vs Target  | < 4h   | **\_**h       | **\_**h       | ↑ ↓ → |
| Actual RPO vs Target  | < 5min | **\_**min     | **\_**min     | ↑ ↓ → |
| Data Integrity Issues | 0      | **\_**        | **\_**        | ↑ ↓ → |
| Critical Incidents    | 0      | **\_**        | **\_**        | ↑ ↓ → |
| S3 Costs              | Budget | $**\_**       | $**\_**       | ↑ ↓ → |
| Team Training Gaps    | None   | [Items]       | [Items]       | ↑ ↓ → |

---

## Cleanup and Follow-up (Day 6)

### Final Tasks

- [ ] **Clean Up Test Databases**
  - Drop test database: `psql -U postgres -c "DROP DATABASE chioma_monthly_drill;"`
  - Drop test user: `psql -U postgres -c "DROP USER drill_user;"`
  - Remove downloaded backups: `rm -rf /backups/drill/`
  - Verify cleanup: `psql -U postgres -l | grep drill`

- [ ] **Archive Drill Report**
  - Save final report to shared location
  - Name: `Recovery_Drill_Report_YYYY_MM_DD.md`
  - Add to disaster recovery documentation
  - Link from this checklist

- [ ] **Create Follow-up Tickets**
  - For each identified issue, create ticket
  - Assign to responsible engineer
  - Set priority level
  - Link to recovery drill report

- [ ] **Schedule Next Month's Drill**
  - First week of next month
  - Same time frame (e.g., 2nd Thursday)
  - Book team calendar
  - Notify stakeholders

- [ ] **Update Team Knowledge Base**
  - Document any new recovery scenarios discovered
  - Add new troubleshooting tips
  - Update FAQ based on questions asked
  - Share with team

---

## Monthly Sign-Off

```
DBA Manager: ________________________
Date: ________________________

Drill Status: ☐ Successful ☐ Completed with Issues ☐ Failed

All tasks completed? ☐ Yes ☐ No
If no, incomplete items: _________________________________

Critical issues identified? ☐ No ☐ Yes
If yes, escalated to: _________________________________

Next month's drill scheduled? ☐ Yes ☐ No
Date: ________________________

Sign-off: ________________________
```

---

## Next Steps

- ✅ Complete full recovery drill
- ✅ Document all metrics and issues
- ✅ Conduct team debrief
- ✅ Communicate results to stakeholders
- ✅ Create follow-up action items
- ✅ Plan improvements for next month
- ✅ Schedule next month's drill

**Checklist updated:** April 2026  
**Review frequency:** Quarterly (with Backup Manager)
