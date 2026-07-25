# Disaster Recovery Procedures

**Version:** 1.0  
**Last Updated:** April 2026  
**Classification:** Internal — Confidential

Step-by-step recovery procedures for disaster scenarios affecting the Chioma platform.

**Related documents:**
- [Disaster Recovery Plan](../DISASTER_RECOVERY_PLAN.md) — overview, objectives, team roles
- [Recovery Runbook](./RECOVERY_RUNBOOK.md) — database-specific recovery scenarios
- [Backup and Recovery](../BACKUP_AND_RECOVERY.md) — backup strategy and procedures
- [Incident Response](../../INCIDENT_RESPONSE.md) — incident classification, escalation, runbooks

---

## Table of Contents

- [Procedure 1: Database Corruption or Data Loss](#procedure-1-database-corruption-or-data-loss)
- [Procedure 2: Complete API Server Outage](#procedure-2-complete-api-server-outage)
- [Procedure 3: Cloud Provider Regional Outage](#procedure-3-cloud-provider-regional-outage)
- [Procedure 4: Security Breach — Credential Compromise](#procedure-4-security-breach--credential-compromise)
- [Procedure 5: Full Platform Recovery (from scratch)](#procedure-5-full-platform-recovery-from-scratch)
- [Procedure 6: Redis Cache Cluster Failure](#procedure-6-redis-cache-cluster-failure)
- [Procedure 7: Stellar Network Disruption](#procedure-7-stellar-network-disruption)
- [Procedure 8: S3 / File Storage Outage](#procedure-8-s3--file-storage-outage)
- [Post-Recovery Validation](#post-recovery-validation)
- [Procedure Success Checklist](#procedure-success-checklist)

---

## Procedure 1: Database Corruption or Data Loss

**Severity:** P1 — Critical  
**RTO:** 2–4 hours  
**RPO:** ≤ 1 hour

### When to Use

- Application logs show `relation does not exist` or `invalid input syntax for type` errors
- Query results contain corrupt data (nulls in non-nullable columns, impossible values)
- Neon/PostgreSQL dashboard reports data integrity violations
- Accidental `DELETE` or `DROP TABLE` executed against production

### Step-by-Step

#### Step 1: Diagnose and Isolate

```bash
# 1. Check the database error logs
docker compose logs postgres --tail 200 | grep -iE "error|corrupt|panic"

# 2. Verify the scope of corruption
# Connect to the database and run integrity checks
psql "$DATABASE_URL" -c "
  SELECT schemaname, tablename, hasindexes, hasrules, hastriggers
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
"

# 3. Check for recently executed destructive queries
psql "$DATABASE_URL" -c "
  SELECT query, query_start, state
  FROM pg_stat_activity
  WHERE query ILIKE '%delete%' OR query ILIKE '%drop%' OR query ILIKE '%truncate%';
"

# 4. Determine if point-in-time recovery (PITR) or full restore is needed
# If the corruption is recent and localised → PITR
# If widespread or the backup itself may be corrupt → full restore
```

#### Step 2: Stop Affected Services

```bash
# Take the API out of the load balancer to prevent further writes
# (Docker Compose)
docker compose stop api

# (Kubernetes)
kubectl scale deployment chioma-backend --replicas=0

# Redirect traffic to a maintenance page
```

#### Step 3: Initiate Recovery

Option A — Point-in-Time Recovery (PITR) via Neon Console:

```bash
# 1. Log in to the Neon console
# 2. Navigate to the production branch
# 3. Select "Restore" → "Point-in-Time"
# 4. Choose a timestamp just before the corruption occurred
# 5. Confirm — Neon creates a new branch at that point
# 6. Update DATABASE_URL in Secrets Manager to point to the new branch
# 7. Restart the API
```

Option B — Full Restore from Latest Clean Backup:

```bash
# 1. Identify the latest known-good backup
aws s3 ls s3://chioma-backups/db/ --human-readable

# 2. Download it
aws s3 cp s3://chioma-backups/db/latest.dump ./restore.dump

# 3. Verify the backup file integrity
pg_restore --list ./restore.dump | head -20
# (If this fails, try the previous backup)

# 4. Create a new database (or use a new Neon branch)
createdb chioma_restored

# 5. Restore
pg_restore --clean --no-acl --no-owner \
  -d postgresql://user:pass@host:5432/chioma_restored \
  ./restore.dump

# 6. Run any pending migrations
pnpm run migration:run
```

#### Step 4: Validate Data Integrity

```bash
# 1. Check row counts on core tables
psql "$DATABASE_URL" -c "
  SELECT 'users' AS tbl, count(*) FROM users
  UNION ALL
  SELECT 'properties', count(*) FROM properties
  UNION ALL
  SELECT 'agreements', count(*) FROM agreements
  UNION ALL
  SELECT 'payments', count(*) FROM payments;
"

# 2. Verify the most recent records exist
psql "$DATABASE_URL" -c "SELECT MAX(created_at) FROM users;"
psql "$DATABASE_URL" -c "SELECT MAX(created_at) FROM payments;"

# 3. Run the application smoke tests
pnpm run test:e2e -- --grep "@smoke"
```

#### Step 5: Resume Service

```bash
# Re-enable the API
docker compose start api
# or
kubectl scale deployment chioma-backend --replicas=3
```

---

## Procedure 2: Complete API Server Outage

**Severity:** P1 — Critical  
**RTO:** 30–60 minutes  
**RPO:** N/A (stateless)

### When to Use

- Health check `/health` returns 5xx or times out
- Load balancer reports all targets unhealthy
- All API pods/containers are in `CrashLoopBackOff` or `Error` state

### Step-by-Step

#### Step 1: Diagnose

```bash
# 1. Check container/pod status
docker compose ps
# or
kubectl get pods -l app=chioma-backend

# 2. Check logs for crash reason
docker compose logs api --tail 100
# or
kubectl logs -l app=chioma-backend --tail=100 --previous

# 3. Check resource usage
docker stats --no-stream
# or
kubectl top pods -l app=chioma-backend
```

#### Step 2: Attempt Restart

```bash
# 1. Simple restart
docker compose restart api
# or
kubectl rollout restart deployment/chioma-backend

# 2. Wait for the service to become healthy
sleep 15
curl -f http://localhost:5000/api/health
```

If the restart succeeds, monitor for 15 minutes and proceed to [Post-Recovery Validation](#post-recovery-validation).

#### Step 3: Rollback (if recent deployment)

```bash
# 1. Check recent deployments
kubectl rollout history deployment/chioma-backend

# 2. Rollback to the previous revision
kubectl rollout undo deployment/chioma-backend

# 3. Verify rollback
kubectl rollout status deployment/chioma-backend

# 4. Check health
curl -f http://localhost:5000/api/health
```

#### Step 4: Rebuild from Stable Tag (if image is corrupt)

```bash
# 1. Identify the last stable Git tag
git tag --sort=-version:refname | head -5

# 2. Checkout the tag
git checkout tags/v<last-stable>

# 3. Rebuild and deploy
docker compose -f docker-compose.production.yml build api
docker compose -f docker-compose.production.yml up -d api

# 4. Verify
curl -f https://api.chioma.io/health
```

---

## Procedure 3: Cloud Provider Regional Outage

**Severity:** P1 — Critical  
**RTO:** 2–4 hours  
**RPO:** ≤ 1 hour

### When to Use

- Multiple independent services are unreachable simultaneously
- Cloud provider status page (AWS Health Dashboard) confirms regional degradation
- Cross-region replication alerts fire

### Step-by-Step

#### Step 1: Confirm the Outage

```bash
# 1. Check the cloud provider status page
# AWS: https://health.aws.amazon.com
# Render: https://status.render.com

# 2. Verify it is not a local issue
ping <db-host>
curl -f https://api.chioma.io/health

# 3. Check if other services in the same region are affected
# (Check monitoring dashboards for multi-service failure patterns)
```

#### Step 2: Activate Cross-Region Failover

```bash
# 1. Promote the read replica in the secondary region to primary
# (Neon — promote read replica via console or CLI)
# (AWS RDS — promote Read Replica)
# Update DATABASE_URL to point to the new primary

# 2. Update REDIS_URL to point to the standby Redis cluster
# (If using ElastiCache — promote the replica cluster)
# (If using Upstash — confirm multi-region is configured)

# 3. Update DNS records to point to the standby infrastructure
# Route53 — update A/AAAA records or failover routing policy
# CloudFront — update origin to standby S3 bucket in secondary region

# 4. Restart all services in the secondary region
docker compose -f docker-compose.production.yml up -d
# or redeploy the Kubernetes manifests pointing to the secondary region
```

#### Step 3: Verify Failover

```bash
# 1. Check health endpoint
curl -f https://api.chioma.io/health

# 2. Verify database connectivity and data
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"

# 3. Test core flows (login, property search, payment initiation)
# (Run smoke tests)
```

#### Step 4: Operate in Degraded Mode (if needed)

If the secondary region has reduced capacity:

```bash
# 1. Scale down non-critical workers
kubectl scale deployment chioma-workers-email --replicas=1
kubectl scale deployment chioma-workers-documents --replicas=0

# 2. Disable non-critical features via feature flags
kubectl set env deployment/chioma-backend FEATURE_ANALYTICS_ENABLED=false
kubectl set env deployment/chioma-backend FEATURE_SCREENING_ENABLED=false

# 3. Communicate degraded status to users via status page
```

#### Step 5: Fail Back (when primary region recovers)

```bash
# 1. Verify primary region is healthy
# Check AWS Health Dashboard for "all clear" status

# 2. Replicate any data written in the secondary region back to primary
# (Reverse replication or manual sync depending on setup)

# 3. Update DNS to point back to primary region

# 4. Restart services in primary region

# 5. Monitor for data consistency issues
```

---

## Procedure 4: Security Breach — Credential Compromise

**Severity:** P1 — Critical  
**RTO:** 2–8 hours  
**RPO:** N/A (data integrity focus)

### When to Use

- `JWT_SECRET` or other critical secrets are exposed in logs, commits, or third-party breach reports
- Unauthorised API calls detected (unusual patterns, unexpected IP ranges)
- Suspicious database queries or data exports
- Third-party notification of credential compromise

### Step-by-Step

#### Step 1: Containment (Immediate)

```bash
# 1. Rotate ALL secrets in AWS Secrets Manager
aws secretsmanager rotate-secret --secret-id chioma/production

# 2. Generate and deploy a new JWT secret
# (This invalidates all existing tokens — all users must re-authenticate)
kubectl set env deployment/chioma-backend \
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 3. Lock down ingress
# (Temporarily restrict API access to trusted IP ranges only)
kubectl scale deployment chioma-backend --replicas=0  # if needed

# 4. Disable compromised user accounts
# Admin API: POST /api/v1/admin/users/{id}/disable
```

#### Step 2: Forensic Assessment

```bash
# 1. Review audit logs for the affected period
psql "$DATABASE_URL" -c "
  SELECT * FROM audit_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 100;
"

# 2. Check security events
psql "$DATABASE_URL" -c "
  SELECT * FROM security_events
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY severity DESC, created_at DESC;
"

# 3. Review application logs for unusual access patterns
# (Use Loki / Grafana to check for geographic anomalies, high-volume callers)

# 4. Check Sentry for unusual error patterns that may indicate probing
```

#### Step 3: Eradication

```bash
# 1. Patch the vulnerability that led to the compromise
# (Specific fix depends on the vector — XSS, SQL injection, exposed endpoint, etc.)

# 2. Remove any unauthorised access (backdoor accounts, API keys)
psql "$DATABASE_URL" -c "
  SELECT id, email, created_at FROM users
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND email NOT IN (SELECT email FROM seed_users);
"

# 3. Verify no unauthorised code has been injected
git log --oneline --since="24 hours ago"
git diff HEAD~1 --name-only
```

#### Step 4: Recovery

```bash
# 1. If data was tampered with, restore from backup
# (See Procedure 1: Database Corruption or Data Loss)

# 2. Re-enable services after security review
kubectl scale deployment chioma-backend --replicas=3

# 3. Force password reset for all affected users
# Admin API: POST /api/v1/admin/users/force-reset-all
```

#### Step 5: Post-Incident

```bash
# 1. File incident report within 24 hours
# (Include timeline, scope, root cause, remediation steps)

# 2. Notify affected users and regulators (if PII was exposed)
# (Use the notification service to send breach notifications)

# 3. Schedule a security review within 48 hours

# 4. Update security documentation and runbooks based on lessons learned
```

---

## Procedure 5: Full Platform Recovery (From Scratch)

**Severity:** P1 — Critical  
**RTO:** 4–8 hours  
**RPO:** ≤ 1 hour (database backup)

### When to Use

- Complete infrastructure loss (all containers, volumes, config destroyed)
- Migration to a new cloud provider or region
- Rebuilding from infrastructure-as-code after a catastrophic failure

### Step-by-Step

#### Phase 1: Provision Infrastructure

```bash
# 1. Clone the repository
git clone https://github.com/chioma/chioma.git
cd chioma/backend

# 2. Restore environment variables from Secrets Manager
aws secretsmanager get-secret-value --secret-id chioma/production \
  | jq -r '.SecretString' > .env.production

# 3. Pull the latest Docker images
docker compose -f docker-compose.production.yml pull

# 4. Start the database and cache layer
docker compose -f docker-compose.production.yml up -d postgres redis

# 5. Wait for the database to be healthy
sleep 15
docker compose exec postgres pg_isready -U chioma
```

#### Phase 2: Restore Data

```bash
# 1. Download the latest verified backup
aws s3 cp s3://chioma-backups/db/latest.dump ./restore.dump

# 2. Verify backup integrity
pg_restore --list ./restore.dump > /dev/null 2>&1 && echo "Backup valid" || echo "Backup corrupt"

# 3. Restore the database
pg_restore --clean --no-acl --no-owner \
  -d "$DATABASE_URL" \
  ./restore.dump

# 4. Run any pending migrations
pnpm run migration:run

# 5. Verify restored data
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"
```

#### Phase 3: Start Services

```bash
# 1. Start all services
docker compose -f docker-compose.production.yml up -d

# 2. Wait for all services to become healthy
sleep 30
docker compose ps

# 3. Verify the API health endpoint
curl -f https://api.chioma.io/health

# 4. Verify the frontend loads
curl -f https://app.chioma.io

# 5. Run smoke tests
pnpm run test:e2e -- --grep "@smoke"
```

#### Phase 4: Verify Integrations

```bash
# 1. Test Stellar connectivity
curl -f "$STELLAR_HORIZON_URL"

# 2. Test S3 access
aws s3 ls s3://chioma-files/

# 3. Test Redis connectivity
docker compose exec redis redis-cli ping

# 4. Test payment gateway (if applicable)
# Trigger a small test payment
```

---

## Procedure 6: Redis Cache Cluster Failure

**Severity:** P2 — High  
**RTO:** 15–30 minutes  
**RPO:** N/A (ephemeral)

### When to Use

- Cache miss rate spikes to >90%
- Bull queue workers are stalled or unreachable
- Application logs show Redis connection errors
- Upstash dashboard reports degraded performance

### Step-by-Step

#### Step 1: Diagnose

```bash
# 1. Check Redis connectivity (self-hosted)
redis-cli -h localhost -p 6379 ping

# 2. Check memory usage (self-hosted)
redis-cli -h localhost -p 6379 INFO memory | grep "used_memory_human"

# 3. Check Upstash status (managed)
curl https://status.upstash.com

# 4. Check connected clients
redis-cli -h localhost -p 6379 INFO clients

# 5. Check for slow commands
redis-cli -h localhost -p 6379 SLOWLOG GET 5
```

#### Step 2: Mitigate

Option A — Self-hosted Redis:

```bash
# 1. Restart Redis
docker compose restart redis

# 2. If corrupt, flush all data and restart
docker compose exec redis redis-cli FLUSHALL
docker compose restart redis

# 3. If OOM, increase maxmemory
docker compose exec redis redis-cli CONFIG SET maxmemory 512mb
```

Option B — Upstash Redis:

```bash
# 1. Verify REDIS_URL and REDIS_TOKEN in Secrets Manager
# 2. Check Upstash dashboard for throttling or rate limits
# 3. Contact Upstash support if needed
```

#### Step 3: Verify Recovery

```bash
# 1. Confirm Redis connectivity
docker compose exec redis redis-cli ping

# 2. Monitor cache hit rate in Grafana
# (Should return to normal baseline within 5-15 minutes as the cache warms up)

# 3. Verify Bull queue workers have reconnected
# (Check Bull Board for job processing)
```

---

## Procedure 7: Stellar Network Disruption

**Severity:** P2 — High  
**RTO:** Dependent on Stellar network (typically < 1 hour)

### When to Use

- Blockchain transactions fail with `tx_bad_seq` or timeout errors
- Horizon API returns 5xx or connection timeouts
- Escrow operations are stuck in "pending" state
- Wallet connections fail

### Step-by-Step

#### Step 1: Diagnose

```bash
# 1. Check Stellar network status
curl -s https://horizon.stellar.org | jq '.core_version'

# 2. Check the Stellar dashboard for known issues
curl https://dashboard.stellar.org

# 3. Check application logs for blockchain errors
docker compose logs api --tail 100 | grep -iE "stellar|horizon|soroban"

# 4. Check queue backlog for blockchain jobs
# (Bull Board at /queues or admin API)
curl https://admin.chioma.io/api/v1/admin/queues/blockchain
```

#### Step 2: Mitigate

```bash
# 1. If Horizon is down, switch to a backup endpoint
kubectl set env deployment/chioma-backend \
  STELLAR_HORIZON_URL=https://horizon-futurenet.stellar.org

# 2. If Soroban RPC is down, switch to a backup
kubectl set env deployment/chioma-backend \
  SOROBAN_RPC_URL=https://soroban-futurenet.stellar.org

# 3. Queue all blockchain operations
# (Bull queue handles retry automatically — do NOT manually resubmit)

# 4. Notify affected users
# "Blockchain operations are temporarily delayed. Your transactions are queued and will be processed once the network recovers."
```

#### Step 3: Monitor

```bash
# 1. Watch the queue backlog in Grafana
# queue_jobs_waiting{queue="blockchain"}

# 2. Watch for successful job completions
# queue_jobs_completed_total{queue="blockchain"}

# 3. When the network recovers, jobs will process automatically
# (No manual intervention needed)
```

---

## Procedure 8: S3 / File Storage Outage

**Severity:** P2 — High  
**RTO:** 30–60 minutes

### When to Use

- File uploads return 403 or 500 errors
- Property images show broken links with 403/404
- Document downloads fail
- S3 bucket is accidentally deleted or misconfigured

### Step-by-Step

#### Step 1: Diagnose

```bash
# 1. Check AWS S3 service health
curl https://status.aws.amazon.com

# 2. Check bucket accessibility
aws s3 ls s3://chioma-files/

# 3. Check bucket configuration
aws s3api get-bucket-versioning --bucket chioma-files
aws s3api get-bucket-location --bucket chioma-files
```

#### Step 2: Mitigate

Option A — Primary Region Outage:

```bash
# 1. Update bucket region to replica region
kubectl set env deployment/chioma-backend AWS_S3_BUCKET_REGION=eu-west-1

# 2. Update CloudFront origin to point to replica bucket
# (AWS Console → CloudFront → Distributions → Edit Origin)

# 3. Restart the API
kubectl rollout restart deployment/chioma-backend
```

Option B — Bucket Deletion / Data Loss:

```bash
# 1. Restore from cross-region replica
aws s3 sync s3://chioma-files-replica s3://chioma-files --source-region eu-west-1

# 2. Verify restoration
aws s3 ls s3://chioma-files/ --recursive --summarize
```

Option C — Permission / Configuration Issue:

```bash
# 1. Verify IAM credentials
aws sts get-caller-identity

# 2. Check bucket policy
aws s3api get-bucket-policy --bucket chioma-files

# 3. Apply the correct policy if needed
# (See deployment/terraform/s3-bucket-policy.json)
```

#### Step 3: Validate

```bash
# 1. Try uploading a test file
curl -X POST -F "file=@test.png" https://api.chioma.io/api/v1/files/upload

# 2. Verify the uploaded file is accessible
curl -I https://cdn.chioma.io/uploads/test.png

# 3. Check existing file URLs return 200
curl -I https://cdn.chioma.io/properties/sample-image.jpg
```

---

## Post-Recovery Validation

After any recovery procedure, run the following validation checks.

### Health Check

```bash
# API health
curl -f https://api.chioma.io/health

# Database connectivity (returns JSON with db status)
curl -f https://api.chioma.io/health/db

# Redis connectivity (if applicable)
curl -f https://api.chioma.io/health/cache
```

### Core Functionality Smoke Tests

```bash
# Authentication
curl -f -X POST https://api.chioma.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@chioma.dev","password":"test123"}'

# Property listing loads
curl -f https://api.chioma.io/api/v1/properties?limit=1

# A core entity can be read
curl -f https://api.chioma.io/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Data Integrity

```bash
# Core tables have expected data
psql "$DATABASE_URL" -c "
  SELECT
    (SELECT count(*) FROM users) AS users,
    (SELECT count(*) FROM properties) AS properties,
    (SELECT count(*) FROM agreements) AS agreements,
    (SELECT count(*) FROM payments) AS payments;
"

# Recent data is present (should be >0 if the app has been running)
psql "$DATABASE_URL" -c "
  SELECT 'users_last_hour' AS metric, count(*) FROM users WHERE created_at > NOW() - INTERVAL '1 hour'
  UNION ALL
  SELECT 'payments_last_hour', count(*) FROM payments WHERE created_at > NOW() - INTERVAL '1 hour';
"
```

### Monitoring Verification

```bash
# Grafana dashboards are receiving data
curl -f https://grafana.chioma.io/api/health

# Prometheus targets are up
curl -f http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'

# Logs are flowing to Loki
curl -f http://localhost:3100/ready
```

---

## Procedure Success Checklist

- [ ] Service is fully restored and accessible
- [ ] Health checks (API, DB, Cache) all return 200
- [ ] Authentication flow works (login, token refresh)
- [ ] Core features work (property list, agreement create, payment)
- [ ] Blockchain/Stellar operations are functional
- [ ] File uploads and downloads work
- [ ] Monitoring dashboards show normal metrics
- [ ] No error alerts firing
- [ ] Affected users have been notified (if applicable)
- [ ] Incident/PIR ticket created
- [ ] Runbook updated with any new lessons learned
