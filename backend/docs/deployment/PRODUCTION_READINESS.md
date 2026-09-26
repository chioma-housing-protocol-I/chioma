# Backend Production Readiness

Operational checklist for backend infrastructure issues aimed at production deployment.
Use this guide when working on production-readiness GitHub issues (for example #957, #988, #991, #994).

## Issue mapping

| Issue | Focus               | Implementation                                                                           |
| ----- | ------------------- | ---------------------------------------------------------------------------------------- |
| #957  | Startup safety      | `src/config/env.validation.ts` — fails fast on missing/weak config in staging/production |
| #988  | Graceful shutdown   | `src/config/graceful-shutdown.ts` — SIGTERM/SIGINT for Kubernetes rollouts               |
| #994  | Backup verification | `scripts/verify-backup.sh` + `make verify-backup`                                        |
| #991  | This runbook        | Pre-deploy checklist, CI commands, staging/production verification                       |

## Pre-PR checklist (contributors)

1. Copy and configure environment: `cp .env.example .env` (local) or set platform secrets (staging/production).
2. Run full CI from `backend/`:
   ```bash
   make ci
   ```
3. For security-sensitive changes:
   ```bash
   make security-ci
   ```
4. Add or update tests for new behaviour.
5. Update documentation (this file and linked guides).
6. Open a PR with `Closes #<issue>` in the description.

## Pre-deploy checklist (staging / production)

### Configuration (#957)

- [ ] `NODE_ENV` is `staging` or `production`
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are unique, ≥32 characters, not example values
- [ ] `DATABASE_URL` includes `sslmode=require` (or `DB_SSL=true` with individual `DB_*` vars)
- [ ] Redis: `REDIS_URL` + `REDIS_TOKEN` (Upstash) or `REDIS_HOST` + `REDIS_PORT`
- [ ] `ENCRYPTION_KEY_BASE64` or `ENCRYPTION_KEYS` configured
- [ ] `SECURITY_ENCRYPTION_KEY` is 64 hex characters
- [ ] Application starts without `Config validation failed` in logs

### Process lifecycle (#988)

- [ ] Kubernetes deployment uses `preStop` sleep (recommended) and sends SIGTERM on rollout
- [ ] Liveness: `GET /health`
- [ ] Readiness: `GET /health/detailed`
- [ ] Rollout completes with zero failed pods; no connection reset spikes in logs

### Backups (#994)

- [ ] Automated backups run on schedule (see [BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md))
- [ ] Metadata check (no DB required):
  ```bash
  BACKUP_VERIFY_METADATA_ONLY=true make verify-backup
  ```
- [ ] Full restore drill (requires PostgreSQL):
  ```bash
  make verify-backup
  ```

### Observability

- [ ] `SENTRY_DSN` set for production error tracking
- [ ] Log level `info` or `warn` in production (`LOG_LEVEL`)
- [ ] Health endpoints reachable from load balancer / ingress

## Verification commands

```bash
cd backend

# Full contributor CI
make ci

# Pre-commit subset
make pre-commit

# Backup metadata only
BACKUP_VERIFY_METADATA_ONLY=true make verify-backup

# Build production artefact
make build
```

## Staging verification

1. Deploy branch to staging.
2. Confirm `/health` returns `ok` and `/health/detailed` shows database + dependencies.
3. Trigger a rolling restart; confirm graceful shutdown log lines and no 5xx spike.
4. Run metadata backup verification against staging backup volume.

## Production verification

1. Repeat staging checks on production URLs.
2. Confirm secrets differ from staging (JWT, encryption keys, DB credentials).
3. Record backup verification timestamp in your ops log.
4. Monitor Sentry and application logs for 15–30 minutes post-deploy.

## Related documentation

- [CONFIGURATION_MANAGEMENT.md](../CONFIGURATION_MANAGEMENT.md)
- [CONFIGURATION_OPTIONS.md](../CONFIGURATION_OPTIONS.md)
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)
- [BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md)
- [RESILIENCE.md](../RESILIENCE.md)
- [INCIDENT_RESPONSE.md](../INCIDENT_RESPONSE.md)
