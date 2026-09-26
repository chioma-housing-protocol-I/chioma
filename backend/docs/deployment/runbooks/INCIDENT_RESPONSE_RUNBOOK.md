# Incident Response Runbook

**Project:** Chioma Platform  
**Version:** 1.0  
**Last Updated:** April 2026  
**Owner:** Security Team / On-Call Engineer  
**Classification:** Internal — Confidential

---

## Purpose

This runbook provides step-by-step procedures for responding to security and operational incidents in the Chioma platform. Use this during an active incident — not as a reference document.

For detailed reference, see [INCIDENT_RESPONSE.md](../../INCIDENT_RESPONSE.md).  
For the deployment rollback procedure, see [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md).

---

## Incident Classification

### Severity Levels

| Level | Name     | Description                                                         | Response Time     |
| ----- | -------- | ------------------------------------------------------------------- | ----------------- |
| P1    | Critical | Service unavailable, data breach, active attack, funds at risk      | Immediate         |
| P2    | High     | Feature degraded, non-critical data exposed, suspicious activity    | 30 minutes        |
| P3    | Medium   | Minor functionality issue, non-sensitive data exposure, alert noise | 4 hours           |
| P4    | Low      | Cosmetic issue, best practice gap, informational                    | Next business day |

### Examples

| Incident Type                                   | Severity |
| ----------------------------------------------- | -------- |
| Authentication bypass discovered                | P1       |
| Active data exfiltration detected               | P1       |
| Database corruption or data loss                | P1       |
| Production API unavailable                      | P1       |
| Payment processing failure                      | P1       |
| Rate limit bypass allowing abuse                | P2       |
| Sensitive data exposed in logs                  | P2       |
| CSRF vulnerability on state-changing endpoint   | P2       |
| Missing security header on production           | P3       |
| Dependency with unpatched CVE (no exploit path) | P3       |
| Deprecated TLS version detected                 | P4       |

---

## Incident Response Steps

### 1. Detect

Incidents may be detected through:

- **Automated alerts**: Prometheus Alertmanager, Sentry error spike, PagerDuty notification
- **Manual reports**: User report, team member observation, security scan finding
- **Scheduled review**: Audit log review, vulnerability scan, penetration test finding

When an incident is detected, the first responder should:

```
1. Acknowledge the alert or report.
2. Determine initial severity (P1-P4).
3. Announce in #incidents channel: "Investigating: [brief description]"
4. Start the incident timer.
```

### 2. Assess

The responder assesses scope and impact:

```bash
# Check service health
curl -s https://api.chioma.io/health | jq '.'

# Check error rates (via Prometheus)
# Sustained 5xx rate > 1% indicates P1/P2

# Check recent deployments
# Has anything changed in the last hour?

# Check Sentry for recent errors
# https://sentry.io/organizations/chioma

# Check audit logs for anomalies
# Query Loki: {app="chioma-backend"} |= "audit" | json | event=~"auth\\.login\\.failure|authz\\.access\\.denied"
```

**Assessment checklist:**

- [ ] What is affected? (API, database, blockchain, frontend)
- [ ] What is the blast radius? (single user, all users, specific feature)
- [ ] Is data at risk? (PII, financial, blockchain assets)
- [ ] Is the incident ongoing or has it ended?
- [ ] Can the impact be mitigated without a full rollback?

### 3. Contain

Contain the incident to prevent further damage:

#### Application-Level Containment

```bash
# Option A: Disable specific feature via feature flag
curl -X POST https://api.chioma.io/admin/feature-flags/disable \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"flag": "affected-feature"}'

# Option B: Block specific IP or user
# Add to blocklist via admin API or WAF

# Option C: Pause the system (emergency only)
curl -X POST https://api.chioma.io/admin/pause \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

#### Infrastructure-Level Containment

```bash
# Block malicious traffic at the load balancer / WAF
# Rate limit a specific endpoint more aggressively

# Rotate compromised credentials
# See: SECRETS_MANAGEMENT.md

# Isolate affected instances
# kubectl scale deployment/chioma-backend --replicas=0 (if compromised)
```

#### Data-Level Containment

```bash
# Revoke access tokens
# Force password reset for affected users

# Take a forensic snapshot of affected data
pg_dump -h $DB_HOST -U $DB_USER -d chioma \
  -t affected_table \
  > /tmp/forensic_snapshot_$(date +%s).sql
```

### 4. Investigate

Gather evidence and determine root cause:

```bash
# Collect logs
docker logs chioma-backend --tail 500 > /tmp/incident_logs_$(date +%s).txt

# Export relevant audit logs
# Query Loki for the incident timeframe

# Check database query logs
# Look for unusual query patterns

# Review application config
# Has any config changed recently?

# Check third-party service status
# Stellar network status, upstream API providers
```

**Evidence to collect:**

- Logs from application, database, and reverse proxy
- Audit log entries for the incident timeframe
- Screenshots of monitoring dashboards
- Deployment and configuration change history
- Any relevant code commits or PRs

### 5. Remediate

Apply the fix:

```bash
# For code-level issues:
# 1. Create a hotfix branch from the release tag
git checkout -b hotfix/incident-description v1.2.3

# 2. Apply the fix
# 3. Get expedited code review
# 4. Run CI pipeline
# 5. Deploy to staging, verify
# 6. Deploy to production

# For configuration issues:
# 1. Update the configuration
# 2. Restart affected services
# 3. Verify fix

# For data issues:
# 1. Restore from backup if needed
# See: RECOVERY_RUNBOOK.md

# 2. Verify data integrity
psql -U chioma -c "SELECT count(*), min(created_at), max(created_at) FROM affected_table;"
```

### 6. Recover

Restore normal operations:

```bash
# If system was paused:
curl -X POST https://api.chioma.io/admin/unpause \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# If feature was disabled:
curl -X POST https://api.chioma.io/admin/feature-flags/enable \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"flag": "affected-feature"}'

# If access was revoked:
# Notify affected users to re-authenticate

# Verify all systems are operational:
curl -s https://api.chioma.io/health | jq '.'
bash scripts/smoke-tests.sh
```

**Post-recovery monitoring (24 hours):**

- [ ] Monitor error rates every 15 minutes for the first 2 hours
- [ ] Monitor latency and throughput
- [ ] Watch for recurrence of the same issue
- [ ] Review logs for related anomalies
- [ ] Confirm all automated alerts are functioning

### 7. Post-Incident Review

Conduct within 72 hours of resolution:

**Incident report template:**

```markdown
# Incident Report: [INCIDENT-XXX]

## Summary

- Date/Time:
- Duration:
- Severity:
- Affected components:
- Impact:

## Timeline

| Time | Event         |
| ---- | ------------- |
|      | Detection     |
|      | Assessment    |
|      | Containment   |
|      | Investigation |
|      | Remediation   |
|      | Recovery      |

## Root Cause

## Contributing Factors

## Detection Gaps

## Remediation Actions

## Preventive Measures

| Action | Owner | Due Date |
| ------ | ----- | -------- |
|        |       |          |

## Lessons Learned

- What went well:
- What could be improved:
- Action items:

## Related Documentation
```

---

## Incident Communication Templates

### Initial Notification (Slack #incidents)

```
🚨 INCIDENT: [P1/P2] - [Brief Description]

Status: Investigating
Started: [timestamp]
Affected: [component/user segment]
Impact: [what's broken]

Channel: #incidents
Responder: @engineer

Next update: [time]
```

### Status Update

```
🔄 UPDATE: [INCIDENT-XXX] - [Brief Description]

Status: [Investigating/Contained/Remediating/Recovering]
Duration: [X minutes so far]

Actions taken:
- [Action 1]
- [Action 2]

Next step:
- [Next action]

Next update: [time]
```

### Resolution

```
✅ RESOLVED: [INCIDENT-XXX] - [Brief Description]

Status: Resolved
Duration: [X minutes]
Root cause: [brief description]
Actions taken: [summary]

Post-incident review scheduled: [date/time]
```

---

## Escalation Matrix

| Role             | Contact                   | Responsibility                       |
| ---------------- | ------------------------- | ------------------------------------ |
| On-Call Engineer | PagerDuty / On-call phone | First responder, triage, containment |
| Security Lead    | security@chioma.io        | Security incident investigation      |
| DevOps Lead      | devops@chioma.io          | Infrastructure incidents             |
| Engineering Lead | engineering@chioma.io     | Code-level remediation               |
| CTO              | cto@chioma.io             | Business decisions, P1 escalation    |

**Escalation path:** On-Call Engineer → Engineering Lead → CTO

---

## Related Documentation

- [Incident Response](../INCIDENT_RESPONSE.md)
- [Security Policies and Standards](../../security/SECURITY_POLICIES_AND_STANDARDS.md)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Database Recovery Runbook](./RECOVERY_RUNBOOK.md)
- [Monitoring and Alerting](../MONITORING_AND_ALERTING.md)
- [Secrets Management](../../security/SECRETS_MANAGEMENT.md)
