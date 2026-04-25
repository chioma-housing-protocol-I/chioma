# Daily Backup Checklist

**Project:** Chioma Platform  
**Frequency:** Daily  
**Owner:** Database Administrator / On-Call Engineer  
**Time Commitment:** 15-20 minutes

---

## Daily Tasks (Must Complete Every Day)

### Morning Review (7 AM)

Review overnight backup completion:

- [ ] **Full Backup Completed**
  - Check: `aws s3 ls s3://chioma-backups-prod/full/ | tail -5`
  - Expected: New backup dated today
  - Action if missing: Check logs immediately → `tail -100 /var/log/chioma/backup-full.log`

- [ ] **Verify Backup File Size**
  - Check: `aws s3 ls s3://chioma-backups-prod/full/ | tail -1`
  - Expected size: 1.5-3 GB for production
  - Action if too small: Investigate data loss → Escalate immediately

- [ ] **WAL Archiving Active**
  - Check: `psql -U chioma -c "SELECT archived_count, failed_count FROM pg_stat_archiver;"`
  - Expected: `archived_count > 0, failed_count = 0`
  - Action if failed: Verify S3 credentials, check network

- [ ] **Review Backup Logs**
  - Check: `tail -50 /var/log/chioma/backup-full.log`
  - Look for: ERROR or FAILED messages
  - Action if errors: Document and investigate immediately

- [ ] **Check S3 Upload Status**
  - Command: `aws s3 ls s3://chioma-backups-prod/full/$(date +%Y%m%d)/ --recursive | wc -l`
  - Expected: > 0 files successfully uploaded
  - Action if missing: Check AWS credentials, verify network connectivity

### Hourly Monitoring (Every 2 Hours)

Brief health checks during business hours:

- [ ] **Database Connectivity**
  - Check: `psql -U chioma -c "SELECT 1;"`
  - Expected: Returns 1
  - Action if fails: Page on-call DBA immediately

- [ ] **Disk Space Check**
  - Check: `df -h /backups`
  - Expected: > 20% free space
  - Action if < 20%: Delete old local backups, expand volume if needed

- [ ] **Application Health**
  - Check: `curl -s http://localhost:3000/health | jq .`
  - Expected: All services healthy
  - Action if unhealthy: Check application logs

### Afternoon Review (4 PM)

Pre-deployment backup readiness:

- [ ] **Prepare for Incremental Backup** (every 6 hours)
  - Check: `aws s3 ls s3://chioma-backups-prod/incremental/ | tail -3`
  - Expected: Recent incremental backups
  - Note: Next incremental at 6 PM and midnight

- [ ] **Verify Replication Status** (if applicable)
  - Check: `psql -U chioma -c "SELECT * FROM pg_stat_replication;"`
  - Expected: Replication lag < 1 second
  - Action if > 1 second: Investigate network, check replica resources

- [ ] **Monitor Backup Queue**
  - Check: `jobs -l` to see background backup processes
  - Expected: No stalled processes
  - Action if stuck: Kill process and restart backup

### Evening Review (6 PM)

Pre-close-of-business verification:

- [ ] **Incremental Backup Status**
  - Check: `tail -20 /var/log/chioma/backup-incremental.log`
  - Expected: Success message
  - Action if failed: Investigate before leaving for the day

- [ ] **Log Rotation**
  - Check: `ls -lh /var/log/chioma/ | grep backup`
  - Expected: Files not exceeding 100 MB each
  - Action if large: Rotate manually: `logrotate -f /etc/logrotate.d/chioma`

- [ ] **Next Backup Schedule**
  - Verify: `crontab -l | grep backup`
  - Expected: Full backup tomorrow at 2 AM
  - Note: Confirm before signing off

---

## Daily Backup Schedule

```
02:00 - Full backup runs
06:00 - Incremental backup #1
12:00 - Incremental backup #2
18:00 - Incremental backup #3
00:00 - Incremental backup #4 + Next day full backup prep
```

---

## Backup Monitoring Dashboard

Keep these metrics visible:

| Metric              | Command                                                                   | Expected   | Alert Threshold   |
| ------------------- | ------------------------------------------------------------------------- | ---------- | ----------------- |
| Last backup success | `aws s3 ls s3://chioma-backups-prod/full/ \| tail -1`                     | < 24h ago  | > 25h             |
| Backup size         | `aws s3 ls s3://chioma-backups-prod/full/ \| tail -1 \| awk '{print $5}'` | 1.5-3 GB   | < 1GB or > 5GB    |
| WAL archives        | `psql -c "SELECT archived_count FROM pg_stat_archiver;"`                  | Increasing | No increase in 1h |
| Disk available      | `df -h /backups`                                                          | > 20%      | < 15%             |
| DB connections      | `psql -c "SELECT count(*) FROM pg_stat_activity;"`                        | < 50       | > 100             |

---

## Daily Incident Response

### If Backup Failed

1. Check logs: `tail -100 /var/log/chioma/backup-full.log`
2. Verify database: `psql -U chioma -c "SELECT COUNT(*) FROM users;"`
3. Check disk: `df -h /backups`
4. Check AWS: `aws s3 ls s3://chioma-backups-prod/full/`
5. If not resolved in 10 minutes: **Escalate immediately**

### If Database Unreachable

1. Check service: `systemctl status postgresql`
2. Check logs: `tail -50 /var/log/postgresql/postgresql.log`
3. Restart if safe: `systemctl restart postgresql`
4. **Do NOT proceed** with backups if DB is compromised

### If Disk Space Critical (< 10%)

1. Delete old local backups: `find /backups -mtime +7 -delete`
2. Clean logs: `find /var/log/chioma -mtime +14 -delete`
3. If still critical: **Escalate immediately** - may need volume expansion

---

## Handoff at End of Day

Before leaving, ensure:

- [ ] All backups completed successfully today
- [ ] No errors in backup logs
- [ ] Database healthy and reachable
- [ ] Disk space > 20%
- [ ] Next scheduled backups ready (check cron)
- [ ] Any issues documented in incident log
- [ ] On-call engineer notified of any concerns
- [ ] Handoff notes for next shift

**Handoff Template:**

```
Date: [Date]
Time: [End of shift time]
Status: ✅ Healthy / ⚠️ Warning / 🔴 Critical

Summary:
- Backups: [# of backups completed]
- Issues: [None / list issues]
- Metrics: DB health [Good/Fair/Poor], Disk usage [%], Backup size [GB]
- Next actions: [Any actions needed for next shift]

Contact if needed: [Your name] at [phone/slack]
```

---

## Common Daily Issues

### "Backup size is too small"

```bash
# Check for data loss
psql -U chioma -c "SELECT COUNT(*) FROM users;"

# Compare to yesterday's size
aws s3 ls s3://chioma-backups-prod/full/ | tail -2

# If significantly smaller, investigate data deletion
# DO NOT restore without understanding why
```

### "WAL archiving stopped"

```bash
# Check PostgreSQL status
systemctl status postgresql

# Check S3 access
aws s3 ls s3://chioma-backups-prod/wal/

# Test archive command
su - postgres -c "aws s3 cp /tmp/test s3://chioma-backups-prod/test/"

# Restart WAL archiving if needed
psql -U postgres -c "CHECKPOINT;"
```

### "Disk space filling up"

```bash
# Find largest files
du -sh /backups/* | sort -h | tail -5

# Cleanup old backups (only after 7 days)
find /backups -mtime +7 -delete

# Check for stuck processes
ps aux | grep pg_
```

---

## Daily Sign-Off

```
DBA/Engineer: ________________________
Date: ________________________
Time: ________________________
All checks passed? ☐ Yes ☐ No (if no, attach incident report)
```

---

## Next Steps

- ✅ Complete all checks
- ✅ Document any issues
- ✅ Notify team of anomalies
- ✅ Hand off to next shift
- ✅ Archive this checklist for audit trail

**Checklist updated:** April 2026  
**Review frequency:** Quarterly (with DBA Team)
