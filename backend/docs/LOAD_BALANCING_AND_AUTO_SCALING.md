# Load Balancing and Auto-Scaling Configuration

This document describes the load balancing and auto-scaling setup for the Chioma backend infrastructure, ensuring high availability and optimal resource utilization in production.

## Table of Contents

1. [Overview](#overview)
2. [Load Balancing](#load-balancing)
3. [Auto-Scaling](#auto-scaling)
4. [Graceful Shutdown](#graceful-shutdown)
5. [Alerting Rules](#alerting-rules)
6. [Deployment](#deployment)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

## Overview

The Chioma backend infrastructure is designed for high availability with:

- **Multi-tier load balancing** via Nginx with least-connections strategy
- **Kubernetes-based auto-scaling** with HPA (Horizontal Pod Autoscaler)
- **Graceful shutdown** with connection cleanup and signal handling
- **Comprehensive alerting** for critical errors and performance issues
- **Health checks** at multiple levels (Kubernetes, Nginx, application)

## Load Balancing

### Nginx Configuration

The Nginx reverse proxy (`backend/nginx/nginx.conf`) provides:

#### Upstream Pool Configuration

```nginx
upstream backend_pool {
    least_conn;  # Least connections load balancing

    server backend-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server backend-2:3000 weight=1 max_fails=3 fail_timeout=30s backup;
    server backend-3:3000 weight=1 max_fails=3 fail_timeout=30s backup;

    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}
```

**Key Features:**

- **Least Connections**: Routes requests to the backend with the fewest active connections
- **Health Checks**: Marks servers as down after 3 failures within 30 seconds
- **Connection Pooling**: Maintains persistent connections for better performance
- **Backup Servers**: Secondary backends for failover scenarios

#### Rate Limiting Zones

Three rate limiting zones are configured:

1. **API Limit**: 10 req/s with 20 burst (general endpoints)
2. **Auth Limit**: 5 req/s with 5 burst (authentication endpoints)
3. **Strict Limit**: 2 req/s with 3 burst (payment endpoints)

#### SSL/TLS Configuration

- **Protocols**: TLSv1.2 and TLSv1.3
- **Session Caching**: 10m shared cache with 10m timeout
- **OCSP Stapling**: Enabled for certificate validation
- **Security Headers**: HSTS, X-Frame-Options, CSP, etc.

#### Endpoint-Specific Configuration

| Endpoint          | Rate Limit   | Purpose                                     |
| ----------------- | ------------ | ------------------------------------------- |
| `/health`         | None         | Health checks (excluded from rate limiting) |
| `/metrics`        | Restricted   | Prometheus metrics (internal only)          |
| `/api/auth/*`     | Auth Limit   | Authentication endpoints                    |
| `/api/payments/*` | Strict Limit | Payment processing                          |
| `/`               | API Limit    | General API endpoints                       |

### Blue-Green Deployment Support

The Nginx configuration supports blue-green deployments:

```nginx
upstream backend_pool {
    server backend-blue:3000 weight=1;
    server backend-green:3000 weight=1 backup;
}
```

To switch traffic:

1. Update the Nginx configuration
2. Reload Nginx: `nginx -s reload`
3. No downtime during the switch

## Auto-Scaling

### Kubernetes Horizontal Pod Autoscaler (HPA)

The HPA (`backend/k8s/hpa.yaml`) automatically scales the backend deployment based on multiple metrics:

#### Scaling Bounds

- **Minimum Replicas**: 3 (always maintain at least 3 instances)
- **Maximum Replicas**: 10 (prevent runaway scaling)

#### Scaling Metrics

1. **CPU Utilization**: Scale up when average CPU > 70%
2. **Memory Utilization**: Scale up when average memory > 80%
3. **HTTP Request Rate**: Scale up when > 1000 req/s per pod
4. **Response Time (P95)**: Scale up when > 1 second

#### Scaling Behavior

**Scale Up:**

- Stabilization: 0 seconds (immediate response)
- Policy 1: Increase by 100% every 30 seconds
- Policy 2: Add 2 pods every 30 seconds
- Selection: Use the maximum (most aggressive)

**Scale Down:**

- Stabilization: 300 seconds (5 minutes)
- Policy 1: Reduce by 50% every 60 seconds
- Policy 2: Remove 1 pod every 60 seconds
- Selection: Use the minimum (most conservative)

### Deployment Strategy

The deployment uses a rolling update strategy:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1 # One extra pod during update
    maxUnavailable: 0 # Zero pods unavailable
```

This ensures:

- No downtime during deployments
- Gradual rollout of new versions
- Easy rollback if issues occur

### Pod Disruption Budget (PDB)

The PDB (`backend/k8s/pdb.yaml`) ensures:

- Minimum 2 pods available at all times
- Prevents accidental disruption of the service
- Allows controlled maintenance operations

## Graceful Shutdown

### Implementation

The graceful shutdown mechanism is implemented in `backend/src/main.ts`:

#### Signal Handlers

```typescript
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) =>
  gracefulShutdown('uncaughtException'),
);
process.on('unhandledRejection', (reason, promise) =>
  gracefulShutdown('unhandledRejection'),
);
```

#### Shutdown Sequence

1. **Stop Accepting Connections**: Close the HTTP server
2. **Wait for In-Flight Requests**: Allow existing requests to complete
3. **Close Database Connections**: Gracefully close TypeORM connections
4. **Close Redis Connections**: Disconnect from Redis
5. **Close Application**: Shut down NestJS application
6. **Exit Process**: Exit with code 0

#### Configuration

- **Graceful Shutdown Timeout**: 30 seconds (configurable via `GRACEFUL_SHUTDOWN_TIMEOUT`)
- **Kubernetes Termination Grace Period**: 45 seconds
- **Nginx Pre-Stop Hook**: 15-second sleep before SIGTERM

### Kubernetes Integration

The deployment includes:

```yaml
lifecycle:
  preStop:
    exec:
      command:
        - sh
        - -c
        - sleep 15 && kill -TERM 1

terminationGracePeriodSeconds: 45
```

This ensures:

1. Nginx removes the pod from load balancer (15s)
2. Application gracefully shuts down (30s)
3. Kubernetes forcefully terminates if needed (45s total)

## Alerting Rules

### Alert Categories

#### Critical Alerts (Immediate Action Required)

1. **HighErrorRate**: Error rate > 5% for 2 minutes
2. **CriticalExceptionRate**: Critical exceptions > 0.1/s for 1 minute
3. **DatabaseConnectionPoolExhausted**: > 90% of connections in use
4. **DatabaseQueryTimeout**: > 0.5 timeouts/s for 2 minutes
5. **RedisConnectionLost**: No active Redis connections
6. **OutOfMemory**: Memory usage > 1.5GB
7. **PaymentProcessingFailure**: Payment errors > 0.1/s
8. **StellarBlockchainUnavailable**: > 10 Stellar API errors
9. **ServiceDown**: Backend service unreachable for 1 minute
10. **HealthCheckFailing**: Health check endpoint failing
11. **DatabaseUnreachable**: > 5 database connection errors
12. **EscrowTransactionFailure**: Escrow failures > 0.05/s

#### Warning Alerts (Investigation Recommended)

1. **HighResponseTime**: P95 response time > 1 second
2. **HighCPUUsage**: CPU > 80% for 5 minutes
3. **SlowDatabaseQueries**: P95 query time > 500ms
4. **HighDatabaseConnections**: > 70% of connections in use
5. **RedisCacheHitRateLow**: Cache hit rate < 70%
6. **HighMemoryUsage**: Memory > 1GB
7. **AuthenticationFailureRate**: Auth failures > 1/s
8. **RateLimitExceeded**: Rate limit violations > 10/s
9. **WebhookDeliveryFailure**: Webhook failures > 0.1/s
10. **DisputeResolutionDelayed**: > 100 pending disputes
11. **KYCVerificationBacklog**: > 50 pending KYC verifications
12. **DiskSpaceRunningLow**: < 10% disk space available
13. **FileDescriptorLimitApproaching**: > 80% of FD limit

### Alert Configuration

Alerts are defined in `backend/monitoring/prometheus/alerts.yml` and managed by AlertManager (`backend/monitoring/alertmanager/alertmanager.yml`).

#### Alert Routing

- **Critical Alerts**: Immediate notification to critical receiver
- **Warning Alerts**: Notification to warning receiver
- **Default Alerts**: Notification to default receiver

#### Webhook Integration

Alerts are sent to the backend webhook endpoint:

```
POST /api/alerts/webhook
```

This allows the application to:

- Log alerts to the database
- Send notifications to administrators
- Trigger automated remediation actions

## Deployment

### Docker Compose (Development/Staging)

```bash
# Start services with load balancing
docker-compose -f docker-compose.production.yml up -d

# Scale backend instances
docker-compose -f docker-compose.production.yml up -d --scale backend=3
```

### Kubernetes (Production)

```bash
# Create namespace
kubectl create namespace production

# Create secrets
kubectl create secret generic chioma-backend-secrets \
  --from-literal=database_url=$DATABASE_URL \
  --from-literal=redis_url=$REDIS_URL \
  --from-literal=jwt_secret=$JWT_SECRET \
  -n production

# Create ConfigMap
kubectl create configmap chioma-backend-config \
  --from-literal=db_host=$DB_HOST \
  --from-literal=db_port=$DB_PORT \
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
kubectl get pdb -n production
```

### Monitoring Deployment

```bash
# Deploy monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3001  # admin/admin

# Access Prometheus
open http://localhost:9090

# Access AlertManager
open http://localhost:9093
```

## Monitoring

### Key Metrics to Monitor

1. **Request Metrics**
   - `http_requests_total`: Total requests by status
   - `http_request_duration_seconds`: Request latency (p50, p95, p99)
   - `http_requests_in_progress`: Current in-flight requests

2. **Error Metrics**
   - `exceptions_total`: Total exceptions by severity
   - `db_query_timeout_total`: Database query timeouts
   - `payment_processing_errors_total`: Payment failures

3. **Resource Metrics**
   - `process_resident_memory_bytes`: Memory usage
   - `process_cpu_seconds_total`: CPU usage
   - `process_open_fds`: Open file descriptors

4. **Database Metrics**
   - `db_pool_active_connections`: Active connections
   - `db_pool_max_connections`: Max connections
   - `db_query_duration_seconds`: Query latency

5. **Cache Metrics**
   - `redis_connected_clients`: Active Redis connections
   - `redis_keyspace_hits_total`: Cache hits
   - `redis_keyspace_misses_total`: Cache misses

### Grafana Dashboards

Pre-configured dashboards are available:

1. **Backend Overview**: Request rate, error rate, response time
2. **Resource Usage**: CPU, memory, disk, file descriptors
3. **Database Performance**: Connection pool, query latency, slow queries
4. **Cache Performance**: Hit rate, evictions, memory usage
5. **Business Metrics**: Payments, disputes, KYC verifications

### Prometheus Queries

Common queries for troubleshooting:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# P95 response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active connections
db_pool_active_connections

# Memory usage
process_resident_memory_bytes / 1024 / 1024 / 1024
```

## Troubleshooting

### Common Issues

#### 1. High Error Rate

**Symptoms**: Alert `HighErrorRate` triggered

**Investigation**:

```bash
# Check error logs
kubectl logs -n production -l app=chioma-backend --tail=100 | grep ERROR

# Check error rate by endpoint
curl http://prometheus:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m]) by (path)'

# Check database connectivity
kubectl exec -it <pod-name> -n production -- npm run db:monitor:health
```

**Resolution**:

- Check database connectivity
- Review recent deployments
- Check external service dependencies (Stellar, Anchor)
- Scale up if resource-constrained

#### 2. High Response Time

**Symptoms**: Alert `HighResponseTime` triggered

**Investigation**:

```bash
# Check slow queries
curl http://prometheus:9090/api/v1/query?query='histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))'

# Check request distribution
kubectl logs -n production -l app=chioma-backend | grep "duration"

# Check database performance
kubectl exec -it <pod-name> -n production -- npm run db:perf-report
```

**Resolution**:

- Analyze slow queries and add indexes
- Scale up database resources
- Implement caching for frequently accessed data
- Review query optimization

#### 3. Memory Leak

**Symptoms**: Alert `HighMemoryUsage` or `OutOfMemory` triggered

**Investigation**:

```bash
# Check memory trend
curl http://prometheus:9090/api/v1/query_range?query='process_resident_memory_bytes'&start=<time>&end=<time>&step=60s

# Check for open handles
kubectl exec -it <pod-name> -n production -- npm run test:leaks

# Check for connection leaks
kubectl logs -n production -l app=chioma-backend | grep "connection"
```

**Resolution**:

- Restart affected pods
- Review recent code changes
- Check for connection pool leaks
- Implement memory profiling

#### 4. Database Connection Pool Exhausted

**Symptoms**: Alert `DatabaseConnectionPoolExhausted` triggered

**Investigation**:

```bash
# Check active connections
curl http://prometheus:9090/api/v1/query?query='db_pool_active_connections'

# Check connection wait time
kubectl logs -n production -l app=chioma-backend | grep "connection pool"

# Check for long-running queries
kubectl exec -it <pod-name> -n production -- npm run db:monitor:health
```

**Resolution**:

- Increase connection pool size
- Optimize query performance
- Implement connection pooling at application level
- Scale up database resources

#### 5. Pod Not Scaling

**Symptoms**: HPA not scaling despite high metrics

**Investigation**:

```bash
# Check HPA status
kubectl describe hpa chioma-backend-hpa -n production

# Check metrics availability
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second

# Check HPA events
kubectl get events -n production | grep HPA
```

**Resolution**:

- Verify metrics are being collected
- Check HPA configuration
- Ensure resource requests are set
- Review Kubernetes metrics server

### Debug Commands

```bash
# Get pod status
kubectl get pods -n production -o wide

# Get pod logs
kubectl logs -n production -l app=chioma-backend --tail=100 -f

# Get pod events
kubectl describe pod <pod-name> -n production

# Get HPA status
kubectl get hpa -n production -o wide

# Get resource usage
kubectl top pods -n production

# Get service endpoints
kubectl get endpoints chioma-backend -n production

# Port forward for debugging
kubectl port-forward -n production svc/chioma-backend 3000:80

# Execute command in pod
kubectl exec -it <pod-name> -n production -- sh
```

### Performance Tuning

#### Nginx Optimization

```nginx
# Increase worker processes
worker_processes auto;

# Increase worker connections
events {
    worker_connections 4096;
}

# Enable HTTP/2 push
http2_push_preload on;

# Optimize buffer sizes
proxy_buffer_size 8k;
proxy_buffers 16 8k;
```

#### Kubernetes Optimization

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
        averageUtilization: 60 # More aggressive scaling
```

#### Application Optimization

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

## References

- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Nginx Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)
- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [Graceful Shutdown Best Practices](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#termination-of-pods)
