# Quick Reference: Load Balancing, Auto-Scaling & Graceful Shutdown

## Essential Commands

### Local Development

```bash
# Build Docker image
docker build -f Dockerfile.production -t chioma-backend:latest .

# Start services
docker-compose -f docker-compose.production.yml up -d

# Stop services
docker-compose -f docker-compose.production.yml down

# View logs
docker-compose logs -f backend

# Test health
curl http://localhost/health
```

### Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace production

# Create secrets
kubectl create secret generic chioma-backend-secrets \
  --from-literal=database_url=$DATABASE_URL \
  --from-literal=redis_url=$REDIS_URL \
  --from-literal=jwt_secret=$JWT_SECRET \
  -n production

# Deploy all components
kubectl apply -f backend/k8s/rbac.yaml
kubectl apply -f backend/k8s/deployment.yaml
kubectl apply -f backend/k8s/service.yaml
kubectl apply -f backend/k8s/hpa.yaml
kubectl apply -f backend/k8s/pdb.yaml

# Verify deployment
kubectl get pods -n production
kubectl get hpa -n production
kubectl get svc -n production
```

### Monitoring

```bash
# Check pod status
kubectl get pods -n production -o wide

# View logs
kubectl logs -n production -l app=chioma-backend -f

# Check HPA status
kubectl get hpa -n production -o wide

# Check resource usage
kubectl top pods -n production

# Port forward for debugging
kubectl port-forward -n production svc/chioma-backend 8080:80
```

### Troubleshooting

```bash
# Describe pod
kubectl describe pod <pod-name> -n production

# Check events
kubectl get events -n production

# Check previous logs (if crashed)
kubectl logs <pod-name> -n production --previous

# Execute command in pod
kubectl exec -it <pod-name> -n production -- sh

# Check database health
kubectl exec -it <pod-name> -n production -- npm run db:monitor:health

# Check performance
kubectl exec -it <pod-name> -n production -- npm run db:perf-report
```

### Scaling

```bash
# Manual scale
kubectl scale deployment chioma-backend --replicas=5 -n production

# Check HPA status
kubectl describe hpa chioma-backend-hpa -n production

# Check metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second
```

### Rollback

```bash
# Check rollout history
kubectl rollout history deployment/chioma-backend -n production

# Rollback to previous version
kubectl rollout undo deployment/chioma-backend -n production

# Rollback to specific revision
kubectl rollout undo deployment/chioma-backend -n production --to-revision=<revision>

# Check rollout status
kubectl rollout status deployment/chioma-backend -n production
```

## Configuration Files

### Load Balancing

- **File**: `backend/nginx/nginx.conf`
- **Key Settings**:
  - Upstream: 3 backends with least-connections
  - Rate limits: 10 req/s (API), 5 req/s (Auth), 2 req/s (Payments)
  - SSL/TLS: TLSv1.2, TLSv1.3
  - Health checks: 3 failures within 30 seconds

### Auto-Scaling

- **File**: `backend/k8s/hpa.yaml`
- **Key Settings**:
  - Min replicas: 3
  - Max replicas: 10
  - CPU threshold: 70%
  - Memory threshold: 80%
  - Request rate: 1000 req/s per pod
  - Response time: 1 second (P95)

### Graceful Shutdown

- **File**: `backend/src/main.ts`
- **Key Settings**:
  - Shutdown timeout: 30 seconds (configurable)
  - Signal handlers: SIGTERM, SIGINT, uncaughtException, unhandledRejection
  - Kubernetes grace period: 45 seconds

### Alerting

- **File**: `backend/monitoring/prometheus/alerts.yml`
- **Key Settings**:
  - Critical alerts: 12 rules
  - Warning alerts: 13 rules
  - Evaluation interval: 15 seconds
  - Webhook: `/api/alerts/webhook`

## Environment Variables

```bash
# Graceful shutdown
GRACEFUL_SHUTDOWN_TIMEOUT=30000

# OpenTelemetry
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-collector:4317

# Sentry
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

## Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# P95 response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99 response time
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Active database connections
db_pool_active_connections

# Database connection pool usage
(db_pool_active_connections / db_pool_max_connections) * 100

# Memory usage (GB)
process_resident_memory_bytes / 1024 / 1024 / 1024

# CPU usage
rate(process_cpu_seconds_total[5m])

# Cache hit rate
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)

# Slow queries (P95)
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))

# Request rate by endpoint
rate(http_requests_total[5m]) by (path)

# Error rate by endpoint
rate(http_requests_total{status=~"5.."}[5m]) by (path)
```

## Alert Thresholds

### Critical Alerts

| Alert                           | Threshold     | Duration |
| ------------------------------- | ------------- | -------- |
| HighErrorRate                   | > 5%          | 2 min    |
| CriticalExceptionRate           | > 0.1/s       | 1 min    |
| DatabaseConnectionPoolExhausted | > 90%         | 2 min    |
| DatabaseQueryTimeout            | > 0.5/s       | 2 min    |
| RedisConnectionLost             | 0 connections | 1 min    |
| OutOfMemory                     | > 1.5GB       | 2 min    |
| PaymentProcessingFailure        | > 0.1/s       | 2 min    |
| StellarBlockchainUnavailable    | > 10 errors   | 2 min    |
| ServiceDown                     | Unreachable   | 1 min    |
| HealthCheckFailing              | Failing       | 2 min    |
| DatabaseUnreachable             | > 5 errors    | 2 min    |
| EscrowTransactionFailure        | > 0.05/s      | 2 min    |

### Warning Alerts

| Alert                          | Threshold     | Duration |
| ------------------------------ | ------------- | -------- |
| HighResponseTime               | P95 > 1s      | 5 min    |
| HighCPUUsage                   | > 80%         | 5 min    |
| SlowDatabaseQueries            | P95 > 500ms   | 5 min    |
| HighDatabaseConnections        | > 70%         | 5 min    |
| RedisCacheHitRateLow           | < 70%         | 10 min   |
| HighMemoryUsage                | > 1GB         | 5 min    |
| AuthenticationFailureRate      | > 1/s         | 5 min    |
| RateLimitExceeded              | > 10/s        | 5 min    |
| WebhookDeliveryFailure         | > 0.1/s       | 5 min    |
| DisputeResolutionDelayed       | > 100 pending | 30 min   |
| KYCVerificationBacklog         | > 50 pending  | 30 min   |
| DiskSpaceRunningLow            | < 10%         | 5 min    |
| FileDescriptorLimitApproaching | > 80%         | 5 min    |

## Common Issues & Solutions

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n production

# Check pod logs
kubectl logs <pod-name> -n production

# Check resource availability
kubectl describe nodes
```

### High Error Rate

```bash
# Check error logs
kubectl logs -n production -l app=chioma-backend | grep ERROR

# Check database connectivity
kubectl exec -it <pod-name> -n production -- npm run db:monitor:health

# Check external services
curl https://horizon.stellar.org/
```

### High Memory Usage

```bash
# Check memory trend
kubectl top pods -n production

# Check for memory leaks
kubectl exec -it <pod-name> -n production -- npm run test:leaks

# Restart pod
kubectl delete pod <pod-name> -n production
```

### Pod Not Scaling

```bash
# Check HPA status
kubectl describe hpa chioma-backend-hpa -n production

# Check metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second

# Check HPA events
kubectl get events -n production | grep HPA
```

### Graceful Shutdown Issues

```bash
# Check shutdown logs
kubectl logs <pod-name> -n production | grep -i shutdown

# Check termination grace period
kubectl get pod <pod-name> -n production -o yaml | grep terminationGracePeriodSeconds

# Manually delete pod
kubectl delete pod <pod-name> -n production --grace-period=45
```

## Performance Tuning

### Increase Replicas

```bash
# Manual scale
kubectl scale deployment chioma-backend --replicas=5 -n production

# Update HPA max replicas
kubectl patch hpa chioma-backend-hpa -n production -p '{"spec":{"maxReplicas":15}}'
```

### Increase Resource Limits

```bash
# Edit deployment
kubectl edit deployment chioma-backend -n production

# Update resources section:
# resources:
#   requests:
#     memory: "1Gi"
#     cpu: "500m"
#   limits:
#     memory: "2Gi"
#     cpu: "2000m"
```

### Adjust HPA Thresholds

```bash
# Edit HPA
kubectl edit hpa chioma-backend-hpa -n production

# Update metrics thresholds:
# metrics:
#   - resource:
#       name: cpu
#       target:
#         averageUtilization: 60  # More aggressive
```

## Documentation

| Document                                  | Purpose                         |
| ----------------------------------------- | ------------------------------- |
| `INFRASTRUCTURE_SETUP.md`                 | Overview and quick start        |
| `DEPLOYMENT_GUIDE.md`                     | Step-by-step deployment         |
| `docs/LOAD_BALANCING_AND_AUTO_SCALING.md` | Detailed load balancing guide   |
| `docs/GRACEFUL_SHUTDOWN.md`               | Shutdown implementation details |
| `docs/ALERTING_RULES.md`                  | Alert rules reference           |
| `IMPLEMENTATION_SUMMARY.md`               | Implementation summary          |
| `QUICK_REFERENCE.md`                      | This file                       |

## Useful Links

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/overview/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the relevant documentation
3. Check application logs
4. Contact the DevOps team

---

**Last Updated**: May 28, 2026  
**Version**: 1.0.0
