# Infrastructure Setup: Load Balancing, Auto-Scaling, Graceful Shutdown & Alerting

This document provides a comprehensive guide to the production-ready infrastructure setup for the Chioma backend, including load balancing, auto-scaling, graceful shutdown, and alerting rules.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Kubernetes 1.24+ (for production)
- kubectl configured
- Prometheus & AlertManager
- Grafana (optional, for visualization)

### Local Development

```bash
# Start services with load balancing
docker-compose -f docker-compose.production.yml up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f backend
```

### Production Deployment

```bash
# Create namespace
kubectl create namespace production

# Create secrets
kubectl create secret generic chioma-backend-secrets \
  --from-literal=database_url=$DATABASE_URL \
  --from-literal=redis_url=$REDIS_URL \
  --from-literal=jwt_secret=$JWT_SECRET \
  -n production

# Deploy
kubectl apply -f backend/k8s/rbac.yaml
kubectl apply -f backend/k8s/deployment.yaml
kubectl apply -f backend/k8s/service.yaml
kubectl apply -f backend/k8s/hpa.yaml
kubectl apply -f backend/k8s/pdb.yaml

# Verify deployment
kubectl get pods -n production
kubectl get hpa -n production
```

## Implementation Summary

### 1. Load Balancing

**File**: `backend/nginx/nginx.conf`

**Features**:

- Least-connections load balancing strategy
- Multi-backend upstream pool with health checks
- Connection pooling and keep-alive
- Rate limiting (3 tiers: API, Auth, Strict)
- SSL/TLS termination with security headers
- Endpoint-specific routing and caching

**Key Metrics**:

- Upstream pool: 3 backends with failover
- Health check: 3 failures within 30 seconds marks server as down
- Connection pooling: 32 keep-alive connections per upstream
- Rate limits: 10 req/s (API), 5 req/s (Auth), 2 req/s (Payments)

### 2. Auto-Scaling

**Files**:

- `backend/k8s/deployment.yaml` - Kubernetes deployment with rolling updates
- `backend/k8s/hpa.yaml` - Horizontal Pod Autoscaler configuration
- `backend/k8s/pdb.yaml` - Pod Disruption Budget for high availability

**Features**:

- Minimum 3 replicas, maximum 10 replicas
- Scaling based on CPU (70%), Memory (80%), Request Rate (1000 req/s), Response Time (1s)
- Rolling update strategy with zero downtime
- Pod anti-affinity for distribution across nodes
- Pod disruption budget ensures minimum availability

**Scaling Behavior**:

- **Scale Up**: Immediate response, 100% increase every 30 seconds
- **Scale Down**: 5-minute stabilization, 50% reduction every 60 seconds

### 3. Graceful Shutdown

**File**: `backend/src/main.ts`

**Features**:

- Signal handlers for SIGTERM, SIGINT, uncaughtException, unhandledRejection
- Connection tracking and graceful closure
- Database connection cleanup
- Redis connection cleanup
- Configurable shutdown timeout (default: 30 seconds)

**Shutdown Sequence**:

1. Stop accepting new connections
2. Wait for in-flight requests to complete
3. Close database connections
4. Close Redis connections
5. Close application
6. Exit process

**Kubernetes Integration**:

- Pre-stop hook: 15-second sleep before SIGTERM
- Termination grace period: 45 seconds
- Allows load balancer to remove pod before shutdown

### 4. Alerting Rules

**File**: `backend/monitoring/prometheus/alerts.yml`

**Alert Categories**:

**Critical Alerts** (12 rules):

- HighErrorRate (> 5% for 2 min)
- CriticalExceptionRate (> 0.1/s for 1 min)
- DatabaseConnectionPoolExhausted (> 90% for 2 min)
- DatabaseQueryTimeout (> 0.5/s for 2 min)
- RedisConnectionLost (0 connections)
- OutOfMemory (> 1.5GB for 2 min)
- PaymentProcessingFailure (> 0.1/s for 2 min)
- StellarBlockchainUnavailable (> 10 errors)
- ServiceDown (unreachable for 1 min)
- HealthCheckFailing (failing for 2 min)
- DatabaseUnreachable (> 5 errors)
- EscrowTransactionFailure (> 0.05/s for 2 min)

**Warning Alerts** (13 rules):

- HighResponseTime (P95 > 1s for 5 min)
- HighCPUUsage (> 80% for 5 min)
- SlowDatabaseQueries (P95 > 500ms for 5 min)
- HighDatabaseConnections (> 70% for 5 min)
- RedisCacheHitRateLow (< 70% for 10 min)
- HighMemoryUsage (> 1GB for 5 min)
- AuthenticationFailureRate (> 1/s for 5 min)
- RateLimitExceeded (> 10/s for 5 min)
- WebhookDeliveryFailure (> 0.1/s for 5 min)
- DisputeResolutionDelayed (> 100 pending for 30 min)
- KYCVerificationBacklog (> 50 pending for 30 min)
- DiskSpaceRunningLow (< 10% for 5 min)
- FileDescriptorLimitApproaching (> 80% for 5 min)

## File Structure

```
backend/
├── src/
│   └── main.ts                          # Graceful shutdown implementation
├── nginx/
│   └── nginx.conf                       # Load balancing configuration
├── k8s/
│   ├── deployment.yaml                  # Kubernetes deployment
│   ├── hpa.yaml                         # Horizontal Pod Autoscaler
│   ├── service.yaml                     # Kubernetes service
│   ├── pdb.yaml                         # Pod Disruption Budget
│   └── rbac.yaml                        # RBAC configuration
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml               # Prometheus configuration
│   │   └── alerts.yml                   # Alert rules (NEW)
│   ├── alertmanager/
│   │   └── alertmanager.yml             # AlertManager configuration
│   └── ...
├── docs/
│   ├── LOAD_BALANCING_AND_AUTO_SCALING.md    # Comprehensive guide
│   ├── GRACEFUL_SHUTDOWN.md                  # Shutdown documentation
│   └── ALERTING_RULES.md                     # Alert rules documentation
└── INFRASTRUCTURE_SETUP.md              # This file
```

## Configuration

### Environment Variables

```bash
# Graceful shutdown timeout (milliseconds)
GRACEFUL_SHUTDOWN_TIMEOUT=30000

# OpenTelemetry tracing
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-collector:4317

# Sentry error tracking
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://...
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=...
DB_PASSWORD=...
DB_NAME=chioma

# Redis
REDIS_URL=redis://...

# JWT
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Stellar
STELLAR_NETWORK=mainnet
STELLAR_HORIZON_URL=https://horizon.stellar.org
SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org
```

### Kubernetes Secrets

```bash
kubectl create secret generic chioma-backend-secrets \
  --from-literal=database_url=$DATABASE_URL \
  --from-literal=redis_url=$REDIS_URL \
  --from-literal=jwt_secret=$JWT_SECRET \
  --from-literal=jwt_refresh_secret=$JWT_REFRESH_SECRET \
  --from-literal=sentry_dsn=$SENTRY_DSN \
  --from-literal=stellar_admin_secret_key=$STELLAR_ADMIN_SECRET_KEY \
  --from-literal=aws_access_key_id=$AWS_ACCESS_KEY_ID \
  --from-literal=aws_secret_access_key=$AWS_SECRET_ACCESS_KEY \
  -n production
```

### Kubernetes ConfigMap

```bash
kubectl create configmap chioma-backend-config \
  --from-literal=db_host=postgres \
  --from-literal=db_port=5432 \
  --from-literal=db_name=chioma \
  --from-literal=aws_region=us-east-1 \
  --from-literal=aws_s3_bucket=chioma-prod \
  -n production
```

## Monitoring

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# P95 response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active database connections
db_pool_active_connections

# Memory usage
process_resident_memory_bytes / 1024 / 1024 / 1024

# CPU usage
rate(process_cpu_seconds_total[5m])
```

### Grafana Dashboards

Pre-configured dashboards available:

1. Backend Overview
2. Resource Usage
3. Database Performance
4. Cache Performance
5. Business Metrics

### AlertManager Webhook

Alerts are sent to:

```
POST /api/alerts/webhook
```

Example payload:

```json
{
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighErrorRate",
        "severity": "critical"
      },
      "annotations": {
        "summary": "High error rate detected",
        "description": "Error rate is 10% (threshold: 5%)"
      }
    }
  ]
}
```

## Testing

### Load Testing

```bash
# Run load test
npm run perf:load

# Run load test with HTML report
npm run perf:local

# Run comprehensive performance test
npm run perf:comprehensive
```

### Graceful Shutdown Testing

```bash
# Start application
npm run start:prod

# In another terminal, send SIGTERM
kill -TERM <pid>

# Observe graceful shutdown logs
```

### Kubernetes Testing

```bash
# Delete pod to trigger graceful shutdown
kubectl delete pod <pod-name> -n production

# Watch pod termination
kubectl get pods -n production -w

# Check logs
kubectl logs <pod-name> -n production
```

## Troubleshooting

### High Error Rate

```bash
# Check error logs
kubectl logs -n production -l app=chioma-backend | grep ERROR

# Check error rate by endpoint
curl http://prometheus:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m]) by (path)'

# Check database connectivity
kubectl exec -it <pod-name> -n production -- npm run db:monitor:health
```

### High Response Time

```bash
# Check slow queries
curl http://prometheus:9090/api/v1/query?query='histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))'

# Check database performance
kubectl exec -it <pod-name> -n production -- npm run db:perf-report

# Check request distribution
kubectl logs -n production -l app=chioma-backend | grep "duration"
```

### Memory Leak

```bash
# Check memory trend
curl http://prometheus:9090/api/v1/query_range?query='process_resident_memory_bytes'&start=<time>&end=<time>&step=60s

# Check for open handles
kubectl exec -it <pod-name> -n production -- npm run test:leaks

# Restart affected pods
kubectl rollout restart deployment/chioma-backend -n production
```

### Pod Not Scaling

```bash
# Check HPA status
kubectl describe hpa chioma-backend-hpa -n production

# Check metrics availability
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second

# Check HPA events
kubectl get events -n production | grep HPA
```

## Performance Tuning

### Nginx Optimization

```nginx
# Increase worker processes
worker_processes auto;

# Increase worker connections
events {
    worker_connections 4096;
}

# Enable HTTP/2 push
http2_push_preload on;
```

### Kubernetes Optimization

```yaml
# Increase resource limits
resources:
  requests:
    memory: '1Gi'
    cpu: '500m'
  limits:
    memory: '2Gi'
    cpu: '2000m'

# Adjust HPA thresholds
metrics:
  - resource:
      name: cpu
      target:
        averageUtilization: 60
```

### Application Optimization

```typescript
// Enable response compression
app.use(compression());

// Implement caching
app.use(cacheManager.middleware());

// Optimize database queries
// - Add indexes
// - Use query optimization
// - Implement connection pooling
```

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Kubernetes secrets created
- [ ] Kubernetes ConfigMap created
- [ ] RBAC configured
- [ ] Deployment created
- [ ] Service created
- [ ] HPA created
- [ ] PDB created
- [ ] Prometheus configured
- [ ] AlertManager configured
- [ ] Grafana dashboards imported
- [ ] Load testing completed
- [ ] Graceful shutdown tested
- [ ] Alert routing verified
- [ ] Runbooks documented
- [ ] Team trained on monitoring

## Maintenance

### Regular Tasks

- **Daily**: Monitor alerts and metrics
- **Weekly**: Review performance trends
- **Monthly**: Analyze alert effectiveness
- **Quarterly**: Review and update alert thresholds
- **Annually**: Capacity planning and optimization

### Backup and Recovery

```bash
# Backup database
kubectl exec -it <pod-name> -n production -- npm run db:backup

# Restore database
kubectl exec -it <pod-name> -n production -- npm run db:restore
```

## References

- [Load Balancing and Auto-Scaling Guide](./docs/LOAD_BALANCING_AND_AUTO_SCALING.md)
- [Graceful Shutdown Documentation](./docs/GRACEFUL_SHUTDOWN.md)
- [Alerting Rules Documentation](./docs/ALERTING_RULES.md)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the relevant documentation
3. Check application logs
4. Contact the DevOps team

## Version History

- **v1.0.0** (2024-05-28): Initial implementation
  - Load balancing with Nginx
  - Kubernetes auto-scaling with HPA
  - Graceful shutdown with signal handlers
  - Comprehensive alerting rules
  - Full documentation
