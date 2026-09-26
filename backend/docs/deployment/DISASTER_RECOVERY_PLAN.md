# Disaster Recovery Plan

**Project:** Chioma Platform  
**Version:** 1.0  
**Last Updated:** April 2026  
**Owner:** Platform Engineering  
**Classification:** Internal — Confidential

---

## 1. Purpose and Scope

This Disaster Recovery Plan (DRP) defines the procedures, responsibilities, and recovery objectives for restoring the Chioma platform following a disruptive event. It covers all production infrastructure including the NestJS backend API, Next.js frontend, PostgreSQL (Neon) database, Redis cache, Stellar blockchain integrations, S3 file storage, and supporting services.

This plan applies to:

- Production environment (`api.chioma.io`, `app.chioma.io`)
- Staging environment (used for DR validation)
- All data stores and third-party integrations

---

## 2. Recovery Objectives

| Metric                             | Target                                                       |
| ---------------------------------- | ------------------------------------------------------------ |
| **RTO** (Recovery Time Objective)  | ≤ 4 hours for full service restoration                       |
| **RPO** (Recovery Point Objective) | ≤ 1 hour of data loss                                        |
| **MTTR** (Mean Time to Recover)    | ≤ 2 hours for partial service                                |
| **Backup Frequency**               | Database: hourly snapshots; Files: continuous S3 replication |

---

## 3. Disaster Scenarios

### 3.1 Severity Levels

| Level             | Description                            | Examples                                  |
| ----------------- | -------------------------------------- | ----------------------------------------- |
| **P1 — Critical** | Full platform outage, data loss risk   | Database corruption, cloud region failure |
| **P2 — High**     | Core feature unavailable               | API down, auth service failure            |
| **P3 — Medium**   | Degraded performance or partial outage | Redis failure, slow queries               |
| **P4 — Low**      | Minor disruption, workaround available | Single service restart needed             |

### 3.2 Covered Scenarios

1. Database failure or corruption (PostgreSQL / Neon)
2. Application server failure (NestJS API)
3. Frontend deployment failure (Next.js)
4. Redis cache failure
5. S3 / file storage unavailability
6. Stellar network disruption
7. Cloud provider (AWS) regional outage
8. Security incident (breach, ransomware)
9. Accidental data deletion
10. DNS or CDN failure

---

## 4. Team and Responsibilities

| Role                   | Responsibility                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| **Incident Commander** | Coordinates response, communicates status, makes escalation decisions |
| **Backend Lead**       | Restores API services, database, and queue workers                    |
| **Frontend Lead**      | Restores frontend deployment and CDN configuration                    |
| **DevOps / Infra**     | Manages infrastructure, DNS, load balancers, and cloud resources      |
| **Security Lead**      | Handles breach response, credential rotation, and audit logging       |
| **Product Lead**       | Communicates with stakeholders and users                              |

**On-call rotation:** Defined in PagerDuty. Primary on-call is notified within 5 minutes of a P1/P2 alert.

---

## 5. Communication Plan

### 5.1 Internal Escalation

1. Automated alert fires (Prometheus / Grafana / Sentry)
2. On-call engineer acknowledges within 15 minutes
3. If P1/P2: Incident Commander is paged immediately
4. Incident channel created in Slack: `#incident-YYYY-MM-DD`
5. Status updates posted every 30 minutes until resolved

### 5.2 External Communication

- **Status page:** Update `status.chioma.io` within 30 minutes of confirmed outage
- **User notification:** In-app banner and email for outages exceeding 1 hour
- **Regulatory notification:** If personal data is involved, notify within 72 hours per applicable regulations

---

## 6. Backup and Replication Strategy

### 6.1 Database (PostgreSQL / Neon)

- **Automated backups:** Neon provides continuous WAL archiving with point-in-time recovery (PITR) up to 7 days
- **Manual snapshots:** Taken before every production deployment via `pg_dump`
- **Snapshot storage:** Encrypted and stored in S3 (`s3://chioma-backups/db/`)
- **Retention:** 7 daily, 4 weekly, 12 monthly snapshots

**Restore command:**

```bash
pg_restore --clean --no-acl --no-owner \
  -d $DATABASE_URL \
  backups/chioma_$(date +%Y%m%d).dump
```

### 6.2 File Storage (S3)

- **Replication:** Cross-region replication enabled (primary: `us-east-1`, replica: `eu-west-1`)
- **Versioning:** S3 versioning enabled on all buckets
- **Lifecycle policy:** 90-day retention for deleted objects

### 6.3 Redis Cache

- Redis is treated as ephemeral. No backup required — cache is rebuilt from the database on restart.
- If Redis is unavailable, the API falls back to direct database queries (degraded performance, not outage).

### 6.4 Application Configuration

- All environment variables stored in AWS Secrets Manager
- Infrastructure defined as code (Docker Compose + Makefile)
- Deployment artifacts versioned in GitHub

---

## 7. Recovery Procedures

### 7.1 Database Failure

**Symptoms:** API returns 500 errors, TypeORM connection errors in logs, Neon dashboard shows unhealthy.

**Steps:**

1. Confirm the failure via Neon dashboard and application logs
2. If connection issue: verify `DATABASE_URL` in Secrets Manager and restart API containers
3. If data corruption: initiate PITR restore via Neon console to the last known good timestamp
4. If full restore needed:

   ```bash
   # Download latest backup
   aws s3 cp s3://chioma-backups/db/latest.dump ./restore.dump

   # Restore to new database
   pg_restore --clean --no-acl --no-owner -d $DATABASE_URL ./restore.dump
   ```

5. Run pending migrations: `npm run migration:run`
6. Validate data integrity with smoke tests
7. Re-enable API traffic

**Estimated RTO:** 1–2 hours

### 7.2 API Server Failure

**Symptoms:** Health check at `/health` returns non-200, load balancer reports unhealthy targets.

**Steps:**

1. Check container logs: `docker logs chioma-api --tail 200`
2. Attempt restart: `docker compose restart api`
3. If restart fails, redeploy from last known good image:
   ```bash
   docker pull ghcr.io/chioma/api:stable
   docker compose up -d api
   ```
4. If image is corrupt, trigger a fresh build from the last stable Git tag:
   ```bash
   git checkout tags/v<last-stable>
   docker compose -f docker-compose.production.yml build api
   docker compose -f docker-compose.production.yml up -d api
   ```
5. Verify health endpoint and run smoke tests

**Estimated RTO:** 30–60 minutes

### 7.3 Frontend Failure

**Symptoms:** `app.chioma.io` returns 502/503, Vercel/CDN reports deployment failure.

**Steps:**

1. Check deployment logs in Vercel dashboard or CI/CD pipeline
2. Roll back to the previous deployment:
   - Vercel: `vercel rollback` or use the Vercel dashboard instant rollback
   - Self-hosted: `docker compose restart frontend` or redeploy previous image
3. If rollback is unavailable, deploy from the last stable tag:
   ```bash
   cd frontend
   git checkout tags/v<last-stable>
   pnpm install --frozen-lockfile
   pnpm build
   ```
4. Verify the frontend loads and can reach the API

**Estimated RTO:** 15–30 minutes

### 7.4 Redis Failure

**Symptoms:** Increased API latency, cache-miss errors in logs, Bull queue workers stalled.

**Steps:**

1. Restart Redis container: `docker compose restart redis`
2. If Redis data is corrupt, flush and restart:
   ```bash
   docker compose exec redis redis-cli FLUSHALL
   docker compose restart redis
   ```
3. Monitor Bull queue workers — they will reconnect automatically
4. Cache will warm up organically over the next 5–15 minutes

**Estimated RTO:** 15 minutes

### 7.5 S3 / File Storage Unavailability

**Symptoms:** File uploads fail, property images return 403/404, document downloads broken.

**Steps:**

1. Check AWS S3 service health at `status.aws.amazon.com`
2. If primary region (`us-east-1`) is down, update `AWS_S3_BUCKET_REGION` to the replica region (`eu-west-1`) in Secrets Manager and restart the API
3. If bucket is accidentally deleted, restore from cross-region replica:
   ```bash
   aws s3 sync s3://chioma-files-replica s3://chioma-files --source-region eu-west-1
   ```
4. Update CloudFront distribution origin if bucket endpoint changes

**Estimated RTO:** 30–60 minutes

### 7.6 Stellar Network Disruption

**Symptoms:** Blockchain transactions fail, escrow operations time out, wallet connections drop.

**Steps:**

1. Check Stellar network status at `dashboard.stellar.org`
2. If Horizon API is down, switch to a backup Horizon endpoint in `STELLAR_HORIZON_URL`
3. Queue all pending blockchain operations in Bull — they will retry automatically when the network recovers
4. Notify affected users via in-app notification that blockchain operations are temporarily delayed
5. Do not attempt to resubmit transactions manually — the queue handles deduplication

**Estimated RTO:** Dependent on Stellar network recovery (typically < 1 hour)

### 7.7 Cloud Provider Regional Outage

**Symptoms:** Multiple services fail simultaneously, AWS console shows regional degradation.

**Steps:**

1. Confirm via AWS Health Dashboard
2. Activate failover to secondary region:
   - Update DNS records to point to standby infrastructure in `eu-west-1`
   - Promote read replica database to primary
   - Restart all services in the secondary region
3. Communicate status to users
4. Once primary region recovers, perform data reconciliation before failing back

**Estimated RTO:** 2–4 hours

### 7.8 Security Incident

**Symptoms:** Unauthorized access detected, unusual API activity, credential exposure.

**Steps:**

1. **Contain immediately:**
   - Rotate all secrets in AWS Secrets Manager
   - Revoke all active JWT tokens by rotating `JWT_SECRET`
   - Disable compromised user accounts
2. **Assess scope:**
   - Review audit logs in `audit_logs` table
   - Check CloudTrail for unauthorized AWS API calls
3. **Eradicate:**
   - Patch the vulnerability
   - Remove any injected code or backdoors
4. **Recover:**
   - Restore from a clean backup if data was tampered with
   - Re-enable services after security review
5. **Post-incident:**
   - File incident report within 24 hours
   - Notify affected users and regulators as required

**Estimated RTO:** 2–8 hours depending on scope

---

## 8. Runbook: Full Platform Restore

Use this procedure when the entire platform needs to be rebuilt from scratch.

```bash
# 1. Provision infrastructure
docker compose -f docker-compose.production.yml pull

# 2. Restore environment variables
aws secretsmanager get-secret-value --secret-id chioma/production \
  | jq -r '.SecretString' > backend/.env.production

# 3. Start database and wait for it to be healthy
docker compose -f docker-compose.production.yml up -d postgres redis
sleep 10

# 4. Restore database from latest backup
aws s3 cp s3://chioma-backups/db/latest.dump ./restore.dump
pg_restore --clean --no-acl --no-owner -d $DATABASE_URL ./restore.dump

# 5. Run migrations
cd backend && npm run migration:run

# 6. Start all services
docker compose -f docker-compose.production.yml up -d

# 7. Verify health
curl https://api.chioma.io/health
curl https://app.chioma.io
```

---

## 9. Testing and Validation

### 9.1 DR Test Schedule

| Test Type                  | Frequency   | Owner              |
| -------------------------- | ----------- | ------------------ |
| Backup restore test        | Monthly     | DevOps             |
| Failover drill (staging)   | Quarterly   | Backend Lead       |
| Full DR simulation         | Annually    | Incident Commander |
| Security incident tabletop | Bi-annually | Security Lead      |

### 9.2 Validation Checklist After Recovery

- [ ] API health endpoint returns 200: `GET /health`
- [ ] Authentication works (login, token refresh)
- [ ] Property listings load with images
- [ ] Agreement creation and signing functional
- [ ] Payment processing operational
- [ ] Blockchain/Stellar transactions processing
- [ ] File uploads and downloads working
- [ ] Notifications delivering
- [ ] Admin dashboard accessible
- [ ] Audit logs recording events

---

## 10. Document Maintenance

This document must be reviewed and updated:

- After every production incident
- When infrastructure changes are made
- At minimum, every 6 months

**Review history:**

| Date       | Author               | Changes         |
| ---------- | -------------------- | --------------- |
| April 2026 | Platform Engineering | Initial version |

---

_For related documentation, see [Deployment Runbook](./DEPLOYMENT.md), [Monitoring and Alerting](./MONITORING_AND_ALERTING.md), and [Backup and Recovery](./BACKUP_AND_RECOVERY.md)._
