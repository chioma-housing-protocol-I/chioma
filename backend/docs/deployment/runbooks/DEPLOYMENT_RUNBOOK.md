# Deployment Runbook

**Project:** Chioma Platform  
**Version:** 1.0  
**Last Updated:** April 2026  
**Owner:** DevOps / On-Call Engineer  
**Classification:** Internal — Confidential

---

## Purpose

This runbook provides step-by-step operational procedures for deploying the Chioma backend to staging and production environments. Use this when performing a deployment — not as a reference document.

For detailed reference, see [DEPLOYMENT.md](../DEPLOYMENT.md).  
For the pre-flight checklist, see [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md).

---

## Quick Reference

### Key Commands

```bash
# Local dev
docker compose -f backend/docker-compose.yml up -d
cd backend && pnpm install && pnpm run migration:run && pnpm run start:dev

# Build production image
docker build -f backend/Dockerfile.production -t ghcr.io/<org>/chioma/backend:<sha> backend

# Run migrations
cd backend && pnpm run migration:run:safe

# Verify health
curl http://localhost:5000/health

# Smoke test
cd backend && bash scripts/smoke-tests.sh
```

### Environment Matrix

| Aspect       | Development         | Staging                              | Production                             |
| ------------ | ------------------- | ------------------------------------ | -------------------------------------- |
| Branch       | feature/\*          | develop                              | main                                   |
| DB           | Local PostgreSQL 15 | Managed PostgreSQL 16                | Managed PostgreSQL 16                  |
| Redis        | Local Redis 7       | Managed Redis 7                      | Managed Redis 7                        |
| Stellar      | Testnet             | Testnet                              | Pubnet                                 |
| Image source | Local build         | GHCR (CI-built)                      | GHCR (CI-built, promoted from staging) |
| Monitoring   | Optional            | Prometheus + Grafana + Loki          | Full stack + Sentry + PagerDuty        |
| Secrets      | .env file           | GitHub Secrets / AWS Secrets Manager | AWS Secrets Manager                    |

---

## Staging Deployment Procedure

### Step 1: Pre-Deploy Checks

```bash
# 1. Confirm target environment
echo "Target: staging"
echo "Branch: develop"

# 2. Verify CI is green
# Check: https://github.com/<org>/chioma/actions

# 3. Review pending migrations
cd backend
pnpm run migration:show

# 4. Verify secrets exist in staging environment
# Check GitHub Secrets for: DATABASE_URL, REDIS_URL, JWT_SECRET, STELLAR_NETWORK, etc.

# 5. Confirm monitoring dashboards are accessible
# Grafana: https://grafana.staging.chioma.io
# Sentry: https://sentry.io/organizations/chioma
```

### Step 2: Build and Push Image (if not done by CI)

```bash
# Trigger CI pipeline by pushing to develop
git push origin develop

# Or build manually:
COMMIT_SHA=$(git rev-parse --short HEAD)
docker build \
  -f backend/Dockerfile.production \
  -t ghcr.io/<org>/chioma/backend:develop-${COMMIT_SHA} \
  -t ghcr.io/<org>/chioma/backend:staging-latest \
  backend/

docker push ghcr.io/<org>/chioma/backend:develop-${COMMIT_SHA}
docker push ghcr.io/<org>/chioma/backend:staging-latest
```

### Step 3: Run Migrations

```bash
# Option A: Via CI (automatic)
# CI pipeline handles migration execution

# Option B: Manually
cd backend
pnpm run migration:run:safe

# Verify migration status
pnpm run migration:show
```

### Step 4: Deploy Application

```bash
# Option A: Docker Compose
DOCKER_IMAGE=ghcr.io/<org>/chioma/backend:staging-latest \
docker compose -f docker-compose.production.yml up -d

# Option B: Kubernetes
kubectl set image deployment/chioma-backend \
  chioma-backend=ghcr.io/<org>/chioma/backend:staging-latest
kubectl rollout status deployment/chioma-backend
```

### Step 5: Post-Deploy Verification

```bash
# 1. Health check
curl -f http://localhost:5000/health

# 2. Detailed health
curl -f http://localhost:5000/health/detailed

# 3. API docs
curl -f http://localhost:5000/api/docs

# 4. Smoke tests
bash scripts/smoke-tests.sh

# 5. Check logs for errors
docker logs chioma-backend-staging --tail 50 | grep ERROR

# 6. Monitor for 15 minutes
# Watch Grafana dashboard for:
#   - Error rate
#   - Request latency
#   - Database connections
#   - Queue depth
```

### Step 6: Announce

- Notify the team in Slack #deployments that staging deployment is complete.
- Document any issues encountered.

---

## Production Deployment Procedure

### Step 1: Pre-Deploy Verification

```bash
# 1. Confirm staging deployment has been verified for at least 24 hours
echo "Staging verification window: $(date -d '-24 hours')"

# 2. Confirm production checklist sign-off
# See: DEPLOYMENT_CHECKLIST.md

# 3. Confirm on-call engineer is aware
echo "On-call notified: $(date)"

# 4. Create a fresh database backup
bash scripts/backup-db.sh

# 5. Verify backup completed successfully
bash scripts/verify-backup.sh

# 6. Confirm CI is green on main branch
# Check: https://github.com/<org>/chioma/actions
```

### Step 2: Promote Image and Deploy

```bash
# 1. Announce deployment start
echo "Production deployment started at $(date)"

# 2. Tag the staging image for production
docker tag ghcr.io/<org>/chioma/backend:staging-latest \
  ghcr.io/<org>/chioma/backend:production-$(git rev-parse --short HEAD)
docker tag ghcr.io/<org>/chioma/backend:staging-latest \
  ghcr.io/<org>/chioma/backend:production-latest

docker push ghcr.io/<org>/chioma/backend:production-$(git rev-parse --short HEAD)
docker push ghcr.io/<org>/chioma/backend:production-latest

# 3. Run database migrations (with rollback prepared)
cd backend
pnpm run migration:run:safe

# 4. Deploy application
DOCKER_IMAGE=ghcr.io/<org>/chioma/backend:production-latest \
docker compose -f docker-compose.production.yml up -d

# Or using blue-green:
# docker compose -f docker-compose.production.yml -p chioma-green up -d
```

### Step 3: Verify Deployment

```bash
# 1. Wait for health checks
for i in $(seq 1 12); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.chioma.io/health)
  if [ "$STATUS" = "200" ]; then
    echo "Health check passed"
    break
  fi
  echo "Waiting for health check... (attempt $i)"
  sleep 10
done

# 2. Run smoke tests
bash scripts/smoke-tests.sh production

# 3. Check Sentry for new errors
# Visit: https://sentry.io/organizations/chioma

# 4. Verify database connectivity
curl -s https://api.chioma.io/health/detailed | jq '.database'

# 5. Verify Redis connectivity
curl -s https://api.chioma.io/health/detailed | jq '.redis'

# 6. Test authentication flow
curl -s -X POST https://api.chioma.io/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@chioma.io","password":"***"}' | jq '.'
```

### Step 4: Monitor

```bash
# Monitor for 30 minutes post-deployment:
#   - Error rate: should be < 0.1% increase
#   - P95 latency: should be < 2s
#   - 5xx rate: should be 0
#   - Database connection pool: should be < 80% utilization
#   - Queue backlog: should be draining

# Watch logs
docker logs chioma-backend-production --tail 100 -f
```

### Step 5: Announce

```
✅ Production deployment complete: <SHA>

Deployed at: $(date)
Duration: X minutes
Image: ghcr.io/<org>/chioma/backend:production-<SHA>

Verification:
- Health check: ✅
- Smoke tests: ✅
- Error rate: Normal
- Latency: Normal

Monitoring window: Next 30 minutes
```

---

## Rollback Procedures

### Application Rollback

```bash
# Revert to previous image
DOCKER_IMAGE=ghcr.io/<org>/chioma/backend:<previous-tag> \
docker compose -f docker-compose.production.yml up -d

# Or via Kubernetes:
kubectl rollout undo deployment/chioma-backend

# Verify rollback
curl -f https://api.chioma.io/health
bash scripts/smoke-tests.sh
```

### Database Rollback

```bash
# 1. Check if last migration is reversible
pnpm run migration:show

# 2. Revert last migration
pnpm run migration:revert:safe

# 3. Verify database state
pnpm run migration:show

# 4. If revert is not possible, restore from backup
bash scripts/db-restore.sh /path/to/latest/backup.sql.gz
```

### Full Rollback (Code + Database)

```bash
# 1. Revert application
kubectl rollout undo deployment/chioma-backend

# 2. Revert database
pnpm run migration:revert:safe

# 3. Verify system health
curl -f https://api.chioma.io/health

# 4. Announce rollback
echo "Rollback to <previous-version> complete. Reason: <reason>"
```

---

## Troubleshooting

### "Container fails to start"

```bash
# Check logs
docker logs chioma-backend --tail 50

# Verify environment variables
docker inspect chioma-backend | jq '.[0].Config.Env'

# Check for missing secrets
# Compare with .env.example

# Verify database connectivity from within container
docker exec chioma-backend nc -zv $DB_HOST $DB_PORT
```

### "Health check fails"

```bash
# Check individual dependencies
curl -s http://localhost:5000/health/detailed | jq '.'

# Check database
docker exec chioma-backend npx typeorm query "SELECT 1"

# Check Redis
docker exec chioma-backend redis-cli ping

# Check disk space
df -h

# Check memory
free -m
```

### "Migration fails"

```bash
# Check migration status
cd backend
pnpm run migration:show

# Check database logs
docker logs chioma-db --tail 50 | grep ERROR

# Check for active locks
docker exec chioma-db psql -U chioma -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Kill blocking queries if needed
# docker exec chioma-db psql -U chioma -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

### "High error rate after deploy"

```bash
# Check Sentry for error grouping
# https://sentry.io/organizations/chioma

# Check recent logs
docker logs chioma-backend --tail 200 | grep ERROR

# Check if a specific endpoint is failing
# Query Prometheus: rate(http_requests_total{status=~"5.."}[5m])

# If issue persists, rollback immediately
```

---

## Escalation

If the deployment cannot be completed or verified within 30 minutes:

1. **Rollback** to the previous known-good version.
2. **Document** the failure reason and any relevant logs.
3. **Notify** the team in #deployments and #incidents.
4. **Schedule** a post-mortem to identify root cause.

**Escalation contacts:**

- DevOps Lead
- Engineering Lead
- On-Call Engineer (PagerDuty)

---

## Related Documentation

- [Deployment Guide](../DEPLOYMENT.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [CI/CD Pipeline](../CI_CD_PIPELINE.md)
- [Release Management](../RELEASE_MANAGEMENT.md)
- [Database Recovery Runbook](./RECOVERY_RUNBOOK.md)
- [Monitoring and Alerting](../MONITORING_AND_ALERTING.md)
