# Deployment Configuration

## Environments

- **Development**: Local development environment
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

## Deployment Process

### Automated Deployment (CI/CD)

1. **Push to branch**
   - `develop` → Deploys to staging
   - `main` → Deploys to production

2. **CI/CD Pipeline**
   - Runs tests and linting
   - Security scanning
   - Builds Docker image
   - Deploys to target environment
   - Runs smoke tests

### Manual Deployment

```bash
# Build Docker image
docker build -f Dockerfile.production -t chioma-backend:latest .

# Deploy using blue-green strategy
./scripts/blue-green-deploy.sh deploy

# Check deployment status
./scripts/blue-green-deploy.sh status
```

## Blue-Green Deployment

Zero-downtime deployments using blue-green strategy:

1. Deploy to inactive environment (blue or green)
2. Run health checks
3. Switch traffic to new environment
4. Keep old environment running briefly
5. Stop old environment after grace period

### Commands

```bash
# Deploy new version
./scripts/blue-green-deploy.sh deploy

# Rollback to previous version
./scripts/blue-green-deploy.sh rollback

# Check current status
./scripts/blue-green-deploy.sh status
```

## Rollback Procedure

### Automatic Rollback

If health checks fail during deployment, automatic rollback occurs.

### Manual Rollback

```bash
# Quick rollback using blue-green
./scripts/blue-green-deploy.sh rollback

# Full rollback with database restore
./scripts/rollback.sh
```

## Database Backups

### Automated Backups

Backups run daily via cron:
```bash
0 2 * * * /path/to/backup-db.sh
```

### Manual Backup

```bash
./scripts/backup-db.sh
```

### Restore from Backup

```bash
# List available backups
ls -lh /var/backups/chioma/

# Restore specific backup
gunzip -c /var/backups/chioma/backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i chioma-postgres-production psql -U $DB_USERNAME -d $DB_NAME
```

## Monitoring

### Health Checks

- **Endpoint**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

### Metrics

- **Endpoint**: `/metrics`
- **Format**: Prometheus
- **Access**: Internal only

### Logs

```bash
# View application logs
docker logs -f chioma-backend-production

# View nginx logs
tail -f /var/log/nginx/chioma-access.log
tail -f /var/log/nginx/chioma-error.log
```

## Security

### SSL/TLS

- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS enabled

### Rate Limiting

- API: 10 requests/second per IP
- Burst: 20 requests

### Security Headers

- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Strict-Transport-Security: enabled

## Performance Targets

- **Deployment Time**: <10 minutes
- **Downtime**: 0 minutes (blue-green)
- **Rollback Time**: <5 minutes
- **Health Check Response**: <200ms

## Disaster Recovery

### RTO (Recovery Time Objective)

- **Target**: 1 hour
- **Maximum**: 4 hours

### RPO (Recovery Point Objective)

- **Target**: 1 hour (hourly backups)
- **Maximum**: 24 hours (daily backups)

### Recovery Steps

1. Assess the situation
2. Notify stakeholders
3. Execute rollback procedure
4. Restore database from backup if needed
5. Verify system functionality
6. Post-mortem analysis

## Environment Variables

### Required Variables

- `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `STELLAR_ADMIN_SECRET_KEY`
- `REDIS_PASSWORD`

### Optional Variables

- `SENTRY_DSN` - Error tracking
- `LOG_LEVEL` - Logging verbosity
- `METRICS_ENABLED` - Enable metrics collection

## Troubleshooting

### Deployment Fails

1. Check CI/CD logs
2. Verify environment variables
3. Check Docker image build
4. Review health check logs

### Application Not Responding

1. Check container status: `docker ps`
2. View logs: `docker logs chioma-backend-production`
3. Check database connection
4. Verify network connectivity

### Database Issues

1. Check PostgreSQL status
2. Verify credentials
3. Check disk space
4. Review connection pool settings

## Support

For deployment issues, contact:
- DevOps Team: devops@chioma.app
- On-call: +1-XXX-XXX-XXXX
