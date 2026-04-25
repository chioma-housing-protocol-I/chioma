# Incident Response Procedures

**Project:** Chioma Platform
**Version:** 1.0
**Last Updated:** April 2026
**Owner:** Platform Engineering
**Classification:** Internal — Confidential

---

## Table of Contents

1. [Overview](#overview)
2. [Incident Classification](#incident-classification)
3. [Detection](#detection)
4. [Escalation](#escalation)
5. [Communication](#communication)
6. [Response](#response)
7. [Tracking](#tracking)
8. [Resolution](#resolution)
9. [Post-Incident Review](#post-incident-review)
10. [Runbooks](#runbooks)
11. [Prevention](#prevention)
12. [Incident Response Checklist](#incident-response-checklist)

---

## Overview

This document defines the end-to-end incident response procedures for the Chioma platform. It covers how incidents are classified, detected, escalated, communicated, tracked, resolved, and reviewed — plus runbooks for common incidents and strategies for prevention.

**Related documentation:**

- [Support and Maintenance](./SUPPORT-AND-MAINTENANCE.md) — SLAs, support channels, on-call
- [Comprehensive Monitoring](./COMPREHENSIVE_MONITORING.md) — metrics, alerting, observability
- [Disaster Recovery Plan](./deployment/DISASTER_RECOVERY_PLAN.md) — full platform outage and DR scenarios
- [Error Handling](./ERROR_HANDLING.md) — exception filters, error classification
- [Security Policies](./security/SECURITY_POLICIES_AND_STANDARDS.md) — breach response, encryption
- [Backup and Recovery](./deployment/BACKUP_AND_RECOVERY.md) — database restore, file recovery

---

## Incident Classification

### Severity Levels

| Severity | Name      | Impact                                              | Response Target | Example                                      |
| -------- | --------- | --------------------------------------------------- | --------------- | -------------------------------------------- |
| **SEV1** | Critical  | Full platform outage or data loss; all users affected | Immediate (≤15 min) | API unreachable, database corruption       |
| **SEV2** | High      | Core feature degraded; significant user impact       | ≤30 min         | Login failures, escrow processing down       |
| **SEV3** | Medium    | Partial feature degradation; workaround available    | ≤2 hours        | Redis cache miss spike, slow property search |
| **SEV4** | Low       | Minor issue; negligible user impact                  | ≤24 hours       | Dashboard rendering delay, stale CDN asset   |

### Classification Criteria

When triaging an incident, evaluate these dimensions:

1. **User Impact** — How many users are affected? Is it total, partial, or negligible?
2. **Business Impact** — Does it affect revenue-generating features (escrow, payments, agreements)?
3. **Data Impact** — Is there any risk of data loss or data integrity violation?
4. **Security Impact** — Does the incident involve unauthorized access, credential exposure, or breach?
5. **Reversibility** — Can the issue be quickly rolled back or mitigated?

### Severity Decision Tree

```
Is the platform completely unreachable OR is data at risk?
├── YES → SEV1 (Critical)
└── NO
    Is a core feature broken for most users (auth, payments, escrow)?
    ├── YES → SEV2 (High)
    └── NO
        Is a feature degraded with a workaround available?
        ├── YES → SEV3 (Medium)
        └── NO → SEV4 (Low)
```

### Incident Categories

| Category          | Description                                | Examples                                          |
| ----------------- | ------------------------------------------ | ------------------------------------------------- |
| **Availability**  | Service or component unreachable           | API down, database unreachable, DNS failure       |
| **Performance**   | Degraded latency or throughput             | High P95 latency, slow queries, queue backlog     |
| **Security**      | Unauthorized access or data exposure       | Breach, credential leak, suspicious API usage     |
| **Data**          | Data loss, corruption, or integrity issue  | Missing records, migration failure, sync drift    |
| **Dependency**    | Third-party or external service failure     | Stellar RPC down, S3 outage, Neon unavailability  |
| **Deployment**    | Failed deploy or bad release               | Build failure, config error, rollback needed       |
| **Fraud**         | Suspicious platform activity               | Fake listings, payment manipulation, bot abuse     |

---

## Detection

### Automated Detection

The Chioma platform uses automated monitoring to detect incidents before users report them.

| Source                | What It Detects                            | Tool                  |
| --------------------- | ------------------------------------------ | --------------------- |
| Prometheus Alerts     | Service down, high error rate, latency     | Alertmanager → PagerDuty/Slack |
| Sentry                | Unhandled exceptions, error spikes         | Sentry → Slack #alerts |
| Grafana Dashboards    | Anomalous metric patterns                  | Manual review, alert rules |
| Uptime Checks         | External endpoint reachability             | PagerDuty synthetics  |
| Bull Queue Monitoring | Failed jobs, growing backlogs              | Prometheus + Grafana  |
| Log Anomalies         | Error rate spikes in Loki                  | LogQL alerts          |

#### Key Alert Rules (reference)

See [Comprehensive Monitoring — Alerting Strategy](./COMPREHENSIVE_MONITORING.md#alerting-strategy) for full rule definitions. Critical alerts include:

- `ServiceDown` — Backend unreachable for ≥1 minute → SEV1
- `HighErrorRate` — 5xx rate >5% over 5 minutes → SEV2
- `HighLatency` — P95 >2s over 10 minutes → SEV3
- `DatabaseConnectionPoolExhausted` — >90% pool usage → SEV2
- `DiskSpaceLow` — <15% remaining → SEV2
- `QueueBacklogGrowing` — Backlog derivative >10 → SEV3

### Manual Detection

Incidents may also be reported through:

| Channel                     | Audience        | Target Response    |
| --------------------------- | --------------- | ------------------ |
| Email (support@chioma.dev)  | External users  | 4 hours (per SLA)  |
| Discord (#support)          | Community users | 4 hours            |
| Slack (#backend-support)    | Internal team   | 2 hours            |
| Slack (#frontend-support)   | Internal team   | 2 hours            |
| GitHub Issues               | Developers      | 24 hours           |
| On-call direct page         | On-call engineer | 15 minutes (SEV1/2) |

### Detection Procedure

1. **Alert fires** → On-call engineer receives page via PagerDuty or Slack notification
2. **Acknowledge** → On-call acknowledges within the response target for the severity
3. **Initial assessment** → Classify severity and category using the criteria above
4. **Declare incident** → If SEV1 or SEV2, formally declare an incident (see [Communication](#communication))
5. **Begin response** → Follow the [Response](#response) procedures

---

## Escalation

### Escalation Levels

| Level | Role                   | When to Escalate To                                    | Contact Method         |
| ----- | ---------------------- | ------------------------------------------------------ | ---------------------- |
| L1    | On-Call Engineer       | Cannot diagnose within 30 min, or SEV1/SEV2 confirmed | PagerDuty → L2        |
| L2    | Backend/Frontend Lead  | Issue spans multiple services, or needs infra access   | Slack DM → L3         |
| L3    | CTO / Engineering Lead | Business-critical, security breach, or data loss       | Phone call / Slack     |
| L4    | CEO / Legal            | Public-facing breach, regulatory, or compliance event  | Phone call from CTO   |

### Escalation Triggers

Escalate immediately when:

- **Time-based:** No progress toward resolution within 2 hours of incident start
- **Severity-based:** SEV1 or confirmed security incident → L2 and L3 notified immediately
- **Scope-based:** Incident affects multiple services or requires infrastructure access the on-call does not have
- **Security-based:** Any suspected breach, credential exposure, or unauthorized access
- **Business-based:** Revenue-impacting features (escrow, payments) are down or degraded

### Escalation Flow

```
Alert Detected
     │
     ▼
On-Call Engineer (L1)
     │
     ├── Diagnosable? ── YES → Begin Response
     │
     └── NO / Timed out (30 min)
              │
              ▼
         Backend/Frontend Lead (L2)
              │
              ├── Resolved? ── YES → Resolution
              │
              └── NO / Cross-service / Security
                       │
                       ▼
                  CTO / Eng Lead (L3)
                       │
                       ├── Business-critical? ── YES
                       │        │
                       │        ▼
                       │   CEO / Legal (L4)
                       │
                       └── NO → Continue Response
```

### External Escalation

For incidents involving third-party dependencies:

| Dependency         | Escalation Path                                     |
| ------------------ | --------------------------------------------------- |
| Neon (PostgreSQL)  | Neon support portal + Neon status page              |
| Stellar Network    | Stellar Dev Discord + Stellar status page           |
| AWS / S3           | AWS Support case (Business or Enterprise tier)      |
| Redis / Upstash    | Upstash support + status page                       |
| Payment Providers  | Provider support portal + account representative    |

---

## Communication

### Communication Principles

- **Transparency** — Keep stakeholders informed; never suppress information
- **Timeliness** — Initial update within 15 minutes of SEV1/SEV2 declaration
- **Accuracy** — State what is known; separate facts from assumptions
- **Brevity** — Updates should be concise and actionable

### Internal Communication

| Channel                  | Purpose                                      | Audience               |
| ------------------------ | -------------------------------------------- | ---------------------- |
| Slack `#incidents`       | Real-time incident coordination              | Engineering team       |
| Slack `#on-call`         | On-call handover and alert discussion        | On-call rotation       |
| Slack `#alerts`          | Automated alert notifications                | Engineering team       |
| PagerDuty                | Paging on-call engineer                      | On-call engineer       |
| Video call (Google Meet) | War room for SEV1/SEV2 incidents             | Incident responders    |

### External Communication

| Channel                    | Purpose                                  | Audience              |
| -------------------------- | ---------------------------------------- | --------------------- |
| Status page (status.chioma.dev) | Service availability updates       | All users             |
| Email (noreply@chioma.dev) | Incident notifications to affected users | Affected users        |
| Discord (#announcements)   | Community updates                        | Community users       |
| Social media               | Public-facing updates for major outages  | Public                |

### Communication Templates

#### Incident Declaration (Slack `#incidents`)

```
🚨 INCIDENT DECLARED

**Severity:** SEV[1-4]
**Category:** [Availability | Performance | Security | Data | Dependency | Deployment | Fraud]
**Title:** [Brief description]
**Impact:** [What is broken and who is affected]
**Started At:** [UTC timestamp]
**Incident Commander:** [@name]
**War Room:** [Google Meet link if SEV1/SEV2]

Current Status: [What we know so far]
Next Update: [Time, e.g., "in 15 minutes"]
```

#### Status Page Update

```
[Investigating | Identified | Monitoring | Resolved]

We are [investigating/aware of] an issue affecting [component(s)].
[Description of user-facing impact].

Started: [UTC timestamp]
Current Status: [Brief status]
Next Update: [Time]
```

#### Stakeholder Update (every 30 min for SEV1, 1 hour for SEV2)

```
INCIDENT UPDATE — [INC-XXX]

**Status:** [Investigating | Mitigating | Monitoring | Resolved]
**Current Impact:** [Updated impact description]
**Actions Taken:** [What has been done]
**Next Steps:** [What is being done next]
**ETA:** [Estimated resolution time, if known]
**Next Update:** [Time]
```

#### Resolution Notification

```
✅ INCIDENT RESOLVED — [INC-XXX]

**Duration:** [Start time] – [End time] ([total duration])
**Root Cause:** [Brief root cause]
**Resolution:** [What fixed it]
**Impact:** [Final impact assessment]
**Post-Incident Review:** [Scheduled date/time]

Thank you for your patience.
```

---

## Response

### Response Roles

| Role                    | Responsibility                                                       |
| ----------------------- | -------------------------------------------------------------------- |
| **Incident Commander**  | Coordinates response, owns communication, makes escalation decisions |
| **Technical Responder** | Diagnoses and implements the fix                                     |
| **Communications Lead** | Manages status page, user notifications, stakeholder updates         |
| **Scribe**              | Documents timeline, decisions, and actions in real-time              |

For SEV3/SEV4, the on-call engineer may fill all roles. For SEV1/SEV2, assign distinct people.

### Response Procedure

#### Step 1: Triage (0–5 minutes)

- [ ] Acknowledge the alert in PagerDuty
- [ ] Classify severity and category
- [ ] Determine blast radius (which services, which users)
- [ ] Declare incident if SEV1/SEV2

#### Step 2: Investigate (5–30 minutes)

- [ ] Check dashboards: Grafana service overview, error rates, latency
- [ ] Check logs: Loki for error spikes, structured log queries
- [ ] Check traces: Distributed tracing for request flow
- [ ] Check recent deployments: Was there a recent release? Consider rollback
- [ ] Check dependencies: Are external services (Neon, Stellar, Redis, S3) healthy?
- [ ] Review runbooks: Match symptoms to a known runbook (see [Runbooks](#runbooks))

#### Step 3: Mitigate (as soon as possible)

- [ ] Implement a fix or workaround to restore service
- [ ] If a recent deployment caused the issue, initiate rollback (see [Deployment Runbook](#runbook-deployment-rollback))
- [ ] If a dependency is down, switch to fallback or degraded mode
- [ ] Update status page with "Identified" status
- [ ] Communicate mitigation to stakeholders

#### Step 4: Monitor (after mitigation)

- [ ] Verify the fix is effective via dashboards and logs
- [ ] Watch for recurrence or new issues
- [ ] Update status page with "Monitoring" status
- [ ] Keep stakeholders informed

#### Step 5: Resolve

- [ ] Confirm service is fully restored
- [ ] Update status page with "Resolved" status
- [ ] Send resolution notification
- [ ] Proceed to [Post-Incident Review](#post-incident-review)

### Emergency Actions

These actions can be taken immediately by the on-call engineer without further approval:

| Action                          | When to Use                                         | How                                                                                     |
| ------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Rollback deployment**         | Recent deploy caused the incident                   | `kubectl rollout undo deployment/chioma-backend` or redeploy previous image             |
| **Scale up instances**          | Traffic spike or resource exhaustion                | `kubectl scale deployment chioma-backend --replicas=N`                                  |
| **Enable maintenance mode**     | Need to block traffic to prevent data corruption    | Set `MAINTENANCE_MODE=true` env var; nginx returns 503                                 |
| **Kill stuck processes**        | Process consuming excessive resources               | `kubectl delete pod <pod-name>` (pod will restart)                                      |
| **Rotate compromised secrets**  | Credential leak confirmed                           | See [Security Incident Runbook](#runbook-security-incident)                             |
| **Failover database**           | Primary database unreachable                        | Promote Neon read replica; see [Disaster Recovery Plan](./deployment/DISASTER_RECOVERY_PLAN.md) |

---

## Tracking

### Incident Identifier

Every incident receives a unique identifier: `INC-YYYY-NNN` (e.g., `INC-2026-001`).

### Incident Record

All incidents are tracked in the Chioma incident tracker. Each record must contain:

| Field               | Description                                        | Example                                  |
| -------------------- | -------------------------------------------------- | ---------------------------------------- |
| **Incident ID**      | Unique identifier                                  | INC-2026-001                             |
| **Title**            | Short descriptive title                            | "API 503 errors on /api/v1/properties"  |
| **Severity**         | SEV1 / SEV2 / SEV3 / SEV4                          | SEV2                                     |
| **Category**         | Incident category                                  | Availability                             |
| **Status**           | Open / Investigating / Mitigating / Monitoring / Resolved / Closed | Investigating |
| **Started At**       | UTC timestamp when incident began                  | 2026-04-24T10:30:00Z                     |
| **Detected At**      | UTC timestamp when monitoring detected it           | 2026-04-24T10:30:02Z                     |
| **Reported By**      | Alert source or person                             | PagerDuty / @engineer                    |
| **Incident Commander** | Person coordinating response                     | @jane-doe                                |
| **Affected Services** | List of impacted components                        | API, Property Search                     |
| **Affected Users**   | Estimated number or percentage                     | ~60% of users                            |
| **Mitigated At**     | UTC timestamp when mitigation applied              | 2026-04-24T10:55:00Z                     |
| **Resolved At**      | UTC timestamp when service fully restored          | 2026-04-24T11:20:00Z                     |
| **Root Cause**       | Brief description of root cause                    | Migration added missing index            |
| **Resolution**       | What fixed the incident                            | Added index, deployed hotfix             |
| **Post-Incident Review** | Link to PIR document                           | [link]                                   |
| **Action Items**     | Follow-up tasks from PIR                           | #1234, #1235                             |

### Incident Timeline

During an active incident, the scribe maintains a real-time timeline:

```
10:30:00 — Alert fired: HighErrorRate on chioma-backend
10:30:15 — @on-call acknowledged
10:32:00 — SEV2 declared; incident commander: @jane-doe
10:33:00 — Status page updated: Investigating
10:35:00 — Identified: deployment v2.4.1 introduced query regression
10:40:00 — Rollback initiated to v2.4.0
10:45:00 — Rollback complete; error rate returning to baseline
10:50:00 — Status page updated: Monitoring
11:00:00 — Error rate <0.1% for 15 minutes; incident resolved
11:05:00 — Status page updated: Resolved
11:10:00 — PIR scheduled for 2026-04-25 14:00 UTC
```

### Metrics

Track these incident metrics to measure response effectiveness:

| Metric                            | Target    | Description                                    |
| --------------------------------- | --------- | ---------------------------------------------- |
| **MTTA** (Mean Time to Acknowledge) | ≤5 min  | Time from alert to acknowledgment              |
| **MTTI** (Mean Time to Identify)  | ≤30 min   | Time from alert to root cause identification   |
| **MTTM** (Mean Time to Mitigate)  | ≤60 min   | Time from alert to mitigation                  |
| **MTTR** (Mean Time to Resolve)   | ≤4 hours  | Time from alert to full resolution             |
| **Incident Rate**                 | Decreasing | Number of SEV1/SEV2 incidents per month        |
| **Repeat Incident Rate**          | <10%      | Incidents with same root cause                 |

---

## Resolution

### Resolution Criteria

An incident is considered resolved when:

1. **Service is restored** — All affected features are functioning normally
2. **Metrics are baseline** — Error rate, latency, and other metrics are within normal ranges
3. **Monitoring confirms** — No recurrence for at least 15 minutes after mitigation
4. **Users unblocked** — Affected users can complete their workflows

### Resolution Steps

1. Verify all affected endpoints return expected responses
2. Confirm dashboards show baseline metrics
3. Check that no new alerts have fired as a result of the fix
4. Update the incident record with resolution details
5. Update the status page to "Resolved"
6. Send resolution notification to stakeholders
7. Close the PagerDuty incident
8. Schedule post-incident review (within 48 hours for SEV1/SEV2)

### Rollback Verification

If the resolution involved a rollback:

- [ ] Confirm the previous version is running
- [ ] Verify all health checks pass
- [ ] Check that the original fix is prepared in a branch for proper deployment
- [ ] Create a follow-up issue to re-deploy the fix with the regression corrected

---

## Post-Incident Review

### When to Conduct a PIR

| Severity | PIR Required? | Timeline           |
| -------- | ------------- | ------------------ |
| SEV1     | Yes           | Within 24 hours    |
| SEV2     | Yes           | Within 48 hours    |
| SEV3     | Optional      | Within 1 week      |
| SEV4     | No            | —                  |

### PIR Process

1. **Schedule** — Incident commander schedules a blameless meeting
2. **Prepare** — Gather timeline, logs, metrics, and screenshots before the meeting
3. **Review** — Walk through the timeline; identify what happened, not who to blame
4. **Analyze** — Determine root cause(s) using "5 Whys" or similar technique
5. **Action Items** — Create specific, assigned, and tracked follow-up tasks
6. **Document** — Write the PIR document and share with the team

### Blameless Culture Principles

- Focus on **what** happened and **why**, not **who** caused it
- Assume everyone acted with good intent and the best information available
- Identify systemic issues, not individual mistakes
- The goal is to prevent recurrence, not assign blame
- Every PIR should produce actionable improvements

### PIR Document Template

```markdown
# Post-Incident Review — INC-YYYY-NNN

## Summary

**Title:** [Incident title]
**Severity:** SEV[1-4]
**Category:** [Category]
**Duration:** [Start] – [End] ([total time])
**Impact:** [User impact summary]
**Incident Commander:** [Name]

## Timeline

| Time (UTC) | Event                                   |
| ---------- | --------------------------------------- |
| HH:MM      | [What happened]                         |

## Root Cause

[Detailed explanation of the root cause]

## Five Whys

1. Why did the incident occur? → [Answer]
2. Why did [Answer 1] happen? → [Answer]
3. Why did [Answer 2] happen? → [Answer]
4. Why did [Answer 3] happen? → [Answer]
5. Why did [Answer 4] happen? → [Answer]

## What Went Well

- [Things that worked during the response]

## What Could Be Improved

- [Things that could have been done better]

## Action Items

| #  | Action Item                             | Owner     | Issue  | Due Date |
| -- | --------------------------------------- | --------- | ------ | -------- |
| 1  | [Specific improvement]                  | @person   | #XXX   | YYYY-MM-DD |

## Lessons Learned

[Key takeaways for the team]
```

### Action Item Tracking

- Every action item must have an owner, a GitHub issue, and a due date
- SEV1 action items are due within 1 week
- SEV2 action items are due within 2 weeks
- The incident commander is responsible for verifying action items are created
- Action items are reviewed in the weekly engineering standup

---

## Runbooks

### Runbook: Service Down (API Unreachable)

**Alert:** `ServiceDown`
**Severity:** SEV1
**Symptoms:** API returns 5xx or times out; health check fails

#### Diagnosis

```bash
# 1. Check if the service process is running
kubectl get pods -l app=chioma-backend

# 2. Check pod logs for crash reasons
kubectl logs -l app=chioma-backend --tail=100

# 3. Check recent deployments
kubectl rollout history deployment/chioma-backend

# 4. Verify database connectivity
kubectl exec -it <pod-name> -- nc -zv <db-host> 5432

# 5. Check Redis connectivity
kubectl exec -it <pod-name> -- nc -zv <redis-host> 6379

# 6. Check node resources
kubectl top nodes
kubectl top pods -l app=chioma-backend
```

#### Mitigation

1. If a recent deployment caused the crash:
   ```bash
   kubectl rollout undo deployment/chioma-backend
   kubectl rollout status deployment/chioma-backend
   ```
2. If OOMKilled, increase memory limits:
   ```bash
   kubectl set resources deployment/chioma-backend -c=app \
     --limits=memory=1Gi
   ```
3. If CrashLoopBackOff, check logs for the crash reason and apply targeted fix
4. If infrastructure issue, check [Disaster Recovery Plan](./deployment/DISASTER_RECOVERY_PLAN.md)

---

### Runbook: High Error Rate

**Alert:** `HighErrorRate`
**Severity:** SEV2
**Symptoms:** 5xx rate >5% over 5 minutes

#### Diagnosis

```bash
# 1. Identify which endpoints are failing
# Grafana: filter http_requests_total by status=~"5.."

# 2. Check error logs in Loki
# LogQL: {service="chioma-backend"} | json | level="error" | __error__=""

# 3. Check Sentry for new error groups
# https://sentry.io/organizations/chioma/issues/

# 4. Check if a specific endpoint is causing the spike
# Look at error breakdown by route in Grafana

# 5. Check for recent deployments
kubectl rollout history deployment/chioma-backend
```

#### Mitigation

1. If a recent deployment, rollback (see [Service Down runbook](#runbook-service-down-api-unreachable))
2. If a specific endpoint, consider disabling it temporarily:
   ```bash
   # Set feature flag or env var to disable the problematic endpoint
   kubectl set env deployment/chioma-backend DISABLE_ENDPOINT_<NAME>=true
   ```
3. If database-related, check [Database Connection Pool runbook](#runbook-database-connection-pool-exhaustion)
4. If third-party API, check [Dependency Failure runbook](#runbook-dependency-failure)

---

### Runbook: High Latency

**Alert:** `HighLatency`
**Severity:** SEV3
**Symptoms:** P95 latency >2s over 10 minutes

#### Diagnosis

```bash
# 1. Identify slow endpoints
# Grafana: http_request_duration_seconds by route

# 2. Check database query performance
# Grafana: db_query_duration_seconds

# 3. Check Redis cache hit rate
# Grafana: redis_cache_hits_total / (redis_cache_hits_total + redis_cache_misses_total)

# 4. Check CPU and memory usage
kubectl top pods -l app=chioma-backend

# 5. Check for slow queries in PostgreSQL
# psql: SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# 6. Check queue backlog
# Grafana: queue_jobs_waiting
```

#### Mitigation

1. If cache hit rate is low, check if cache keys are invalidating prematurely
2. If slow database queries, add missing indexes or optimize query
3. If high CPU, scale up:
   ```bash
   kubectl scale deployment chioma-backend --replicas=4
   ```
4. If queue backlog, add more workers:
   ```bash
   kubectl scale deployment chioma-workers --replicas=3
   ```

---

### Runbook: Database Connection Pool Exhaustion

**Alert:** `DatabaseConnectionPoolExhausted`
**Severity:** SEV2
**Symptoms:** >90% of database connections in use; queries timing out

#### Diagnosis

```bash
# 1. Check active connections
# psql: SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# 2. Check long-running queries
# psql: SELECT pid, now() - pg_stat_activity.query_start AS duration, query
#       FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;

# 3. Check connection pool config
# Look at TypeORM connection config: max pool size, idle timeout

# 4. Check for connection leaks in application logs
# LogQL: {service="chioma-backend"} | json | level="warn" | "connection"
```

#### Mitigation

1. Kill long-running idle queries:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND query_start < now() - interval '10 minutes';
   ```
2. Restart the application to reset connection pool:
   ```bash
   kubectl rollout restart deployment/chioma-backend
   ```
3. Increase pool size if needed (temporary):
   ```bash
   kubectl set env deployment/chioma-backend DB_POOL_SIZE=20
   ```
4. Identify and fix the root cause (missing transaction cleanup, unclosed connections)

---

### Runbook: Deployment Rollback

**When to Use:** A recent deployment caused an incident
**Severity:** Varies

#### Procedure

```bash
# 1. Check deployment history
kubectl rollout history deployment/chioma-backend

# 2. Rollback to previous revision
kubectl rollout undo deployment/chioma-backend

# 3. Verify rollback
kubectl rollout status deployment/chioma-backend
kubectl get pods -l app=chioma-backend

# 4. Check health endpoint
curl -f http://localhost:5000/api/health

# 5. Monitor error rates for 15 minutes
# Grafana: http_requests_total{status=~"5.."}
```

#### Frontend Rollback

```bash
# Vercel: redeploy previous deployment
vercel rollback --token=$VERCEL_TOKEN

# Or: redeploy previous image
kubectl rollout undo deployment/chioma-frontend
```

---

### Runbook: Security Incident

**Severity:** SEV1 (if breach confirmed) or SEV2 (if investigating)
**Symptoms:** Unauthorized access, credential leak, suspicious activity

#### Immediate Actions

1. **Contain** — Revoke compromised credentials immediately
   ```bash
   # Rotate JWT signing secret
   kubectl set env deployment/chioma-backend JWT_SECRET=<new-secret>

   # Rotate API keys if compromised
   # Use admin API: POST /api/v1/admin/api-keys/{id}/rotate

   # Force password reset for affected users
   # Use admin API: POST /api/v1/admin/users/{id}/force-password-reset
   ```
2. **Assess** — Determine what was accessed or exfiltrated
   - Review audit logs: `SELECT * FROM audit_logs WHERE created_at > '<incident-start>' ORDER BY created_at DESC;`
   - Check access patterns in Grafana / Loki
   - Review Sentry for related error events

3. **Escalate** — Notify CTO and Security Lead immediately
   - If PII was exposed, engage Legal (L4 escalation)
   - If financial data was accessed, notify compliance team

4. **Communicate** — Update status page; do NOT share details of active investigation externally

5. **Document** — Record all actions taken with timestamps

#### Post-Containment

- Rotate all potentially compromised secrets (see [Secrets Management](./security/SECRETS_MANAGEMENT.md))
- Review and revoke unnecessary permissions
- Enable enhanced monitoring on affected accounts
- Schedule immediate PIR (within 24 hours)
- Prepare regulatory notification if required

---

### Runbook: Redis Cache Failure

**Alert:** `RedisMemoryHigh`, `RedisCacheHitRateLow`, or Redis unreachable
**Severity:** SEV3
**Symptoms:** Cache misses spike; increased database load; slow responses

#### Diagnosis

```bash
# 1. Check Redis health
redis-cli -h <redis-host> ping

# 2. Check memory usage
redis-cli -h <redis-host> info memory

# 3. Check connected clients
redis-cli -h <redis-host> info clients

# 4. Check slow log
redis-cli -h <redis-host> slowlog get 10

# 5. Check eviction policy
redis-cli -h <redis-host> config get maxmemory-policy
```

#### Mitigation

1. If memory is full, evict stale keys:
   ```bash
   redis-cli -h <redis-host> --scan --pattern "session:*" | xargs redis-cli -h <redis-host> del
   ```
2. If Redis is unreachable, the application falls back to database queries (by design)
3. If Upstash Redis is down, check Upstash status page
4. If cache hit rate is low after a deployment, verify cache key format hasn't changed

---

### Runbook: Dependency Failure (Third-Party Service Down)

**Severity:** SEV2 (core dependency) or SEV3 (non-core dependency)
**Symptoms:** External API errors, timeout spikes for third-party calls

#### Diagnosis

```bash
# 1. Check which external service is failing
# Grafana: stellar_rpc_errors_total, tenant_screening_api_duration_seconds, etc.

# 2. Verify the service's status page
# Stellar: https://status.stellar.org
# Neon: https://neonstatus.com
# Upstash: https://status.upstash.com

# 3. Check if our API keys or credentials are still valid
# Test with a direct curl to the service

# 4. Check for rate limiting from the provider
# LogQL: {service="chioma-backend"} | json | "429" | "rate_limit"
```

#### Mitigation

1. If the dependency is non-critical, gracefully degrade:
   - Tenant screening → show "verification pending" status
   - Blockchain events → queue for later processing
2. If the dependency is critical (database, auth):
   - Check [Disaster Recovery Plan](./deployment/DISASTER_RECOVERY_PLAN.md)
   - Escalate to L2/L3
3. Enable circuit breaker if available
4. Monitor dependency recovery and resume normal processing

---

### Runbook: Queue Backlog / Failed Jobs

**Alert:** `QueueBacklogGrowing`, `HighJobFailureRate`
**Severity:** SEV3
**Symptoms:** Growing queue depth; failed job count increasing

#### Diagnosis

```bash
# 1. Check queue status in Bull Board
# https://admin.chioma.io/queues (or local http://localhost:5000/queues)

# 2. Identify which queue is affected
# Grafana: queue_jobs_waiting by queue

# 3. Inspect failed jobs
# Bull Board: click on failed tab for the affected queue

# 4. Check worker logs
kubectl logs -l app=chioma-workers --tail=200 | grep -i "error"

# 5. Check if a downstream dependency is failing
# (e.g., email provider, blockchain RPC)
```

#### Mitigation

1. If jobs are failing due to a transient error, retry them:
   ```bash
   # Via Bull Board: "Retry Failed" button
   # Or via admin API: POST /api/v1/admin/queues/{queueName}/retry-failed
   ```
2. If a specific job type is causing failures, pause it:
   ```bash
   kubectl set env deployment/chioma-workers PAUSE_QUEUE_<NAME>=true
   ```
3. Scale up workers to clear backlog:
   ```bash
   kubectl scale deployment chioma-workers --replicas=5
   ```
4. If jobs are stuck due to invalid data, investigate and fix the data, then retry

---

## Prevention

### Proactive Monitoring

- **Review alert volume weekly** — Adjust thresholds to reduce noise and catch issues earlier
- **Monitor trends** — Track error rates, latency, and resource usage trends; act before they become incidents
- **Capacity planning** — Review resource utilization monthly; scale before limits are reached
- **Dependency health checks** — Monitor external service health; set up synthetic checks

### Code Quality

- **Code review** — All changes require review per [Code Review Standards](./community/CODE_REVIEW_STANDARDS.md)
- **Testing** — Maintain test coverage per [Testing Standards](./community/TESTING_STANDARDS.md)
- **Feature flags** — Use feature flags for risky changes to enable quick rollback without redeployment
- **Gradual rollouts** — Deploy to staging first; use canary or progressive deployments in production

### Infrastructure Resilience

- **Redundancy** — Run multiple replicas; use multi-AZ where possible
- **Circuit breakers** — Implement circuit breakers for all external dependencies
- **Rate limiting** — Protect services with per-user and per-IP rate limits
- **Graceful degradation** — Design features to degrade rather than fail when dependencies are unavailable

### Operational Practices

- **Runbook maintenance** — Review and update runbooks quarterly or after each SEV1/SEV2 PIR
- **Chaos testing** — Periodically test resilience by simulating failures in staging
- **Backup verification** — Verify backups are restorable monthly (see [Backup and Recovery](./deployment/BACKUP_AND_RECOVERY.md))
- **On-call readiness** — Ensure on-call engineers have access to all tools and documentation
- **Incident drills** — Conduct quarterly incident response drills simulating SEV1 scenarios

### Learning from Incidents

- **PIR action items** — Track and close all PIR action items; review weekly
- **Repeat incidents** — Flag if the same root cause appears more than once; escalate to architecture review
- **Near-misses** — Document near-misses (issues that almost became incidents) and apply preventive measures
- **Metric tracking** — Track MTTA, MTTI, MTTM, MTTR over time; target continuous improvement

---

## Incident Response Checklist

### On-Call Engineer — Incident Start

- [ ] Acknowledge alert in PagerDuty within 5 minutes
- [ ] Classify severity (SEV1–SEV4) and category
- [ ] Assess blast radius (services and users affected)
- [ ] If SEV1/SEV2: Declare incident in Slack `#incidents`
- [ ] If SEV1/SEV2: Assign roles (Incident Commander, Technical Responder, Communications Lead, Scribe)
- [ ] If SEV1/SEV2: Open war room video call
- [ ] Start the incident timeline document
- [ ] Check dashboards and logs to begin diagnosis
- [ ] Update status page with "Investigating" status

### During Incident

- [ ] Follow the [Response](#response) procedure
- [ ] Review relevant [Runbooks](#runbooks)
- [ ] Provide stakeholder updates at regular intervals
- [ ] Escalate if no progress within 30 minutes (see [Escalation](#escalation))
- [ ] Document all actions and decisions in the timeline

### After Mitigation

- [ ] Confirm metrics are returning to baseline
- [ ] Update status page to "Monitoring"
- [ ] Continue monitoring for at least 15 minutes
- [ ] Verify no new issues were introduced by the mitigation

### Incident Resolution

- [ ] Confirm all affected features are working
- [ ] Update status page to "Resolved"
- [ ] Send resolution notification
- [ ] Close PagerDuty incident
- [ ] Complete the incident record with all fields
- [ ] Schedule post-incident review (within 24h for SEV1, 48h for SEV2)

### Post-Incident Review

- [ ] Prepare timeline, logs, metrics, and screenshots
- [ ] Conduct blameless PIR meeting
- [ ] Identify root cause and contributing factors
- [ ] Document what went well and what could be improved
- [ ] Create action items with owners and due dates
- [ ] Share PIR document with the team
- [ ] Track action items to completion
- [ ] Update runbooks if needed based on lessons learned

---

## References

- [Comprehensive Monitoring and Observability Guide](./COMPREHENSIVE_MONITORING.md)
- [Disaster Recovery Plan](./deployment/DISASTER_RECOVERY_PLAN.md)
- [Backup and Recovery](./deployment/BACKUP_AND_RECOVERY.md)
- [Security Policies and Standards](./security/SECURITY_POLICIES_AND_STANDARDS.md)
- [Secrets Management](./security/SECRETS_MANAGEMENT.md)
- [Error Handling](./ERROR_HANDLING.md)
- [Support and Maintenance](./SUPPORT-AND-MAINTENANCE.md)
- [Deployment Guide](./deployment/DEPLOYMENT.md)
- [Google SRE Book — Incident Response](https://sre.google/sre-book/managing-incidents/)
- [PagerDuty — Incident Response](https://response.pagerduty.com/)
