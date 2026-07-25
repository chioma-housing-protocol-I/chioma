# Comprehensive Monitoring and Observability Guide

This document provides comprehensive guidance on monitoring and observability for the Chioma platform, covering metrics collection, event monitoring, alerting strategies, and observability best practices.

## Table of Contents

1. [Overview](#overview)
2. [Metrics Collection](#metrics-collection)
3. [Event Monitoring](#event-monitoring)
4. [Alerting Strategy](#alerting-strategy)
5. [Observability Best Practices](#observability-best-practices)
6. [Implementation Guide](#implementation-guide)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Observability Pillars

Observability consists of three pillars:

1. **Metrics**: Quantitative measurements of system behavior
   - Time-series data
   - Aggregatable and queryable
   - Low cardinality dimensions
   - Examples: request rate, latency, error rate

2. **Logs**: Detailed event records
   - Structured and unstructured
   - High cardinality data acceptable
   - Searchable and filterable
   - Examples: request details, errors, state changes

3. **Traces**: Request flow through system
   - Distributed tracing
   - Latency breakdown
   - Dependency mapping
   - Examples: request path, service calls, database queries

### Goals

- **Detect**: Identify issues before customers notice
- **Diagnose**: Understand root cause quickly
- **Debug**: Investigate complex interactions
- **Optimize**: Identify performance bottlenecks
- **Comply**: Maintain audit trails and compliance records

---

## Metrics Collection

### 1. Metrics Architecture

#### Collection Stack

```
Application Instrumentation
         ↓
    Prometheus Client
         ↓
    /metrics Endpoint
         ↓
    Prometheus Server
         ↓
    Time-Series Database
         ↓
    Grafana / Alertmanager
```

#### Scrape Configuration

```yaml
# backend/monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: production
    cluster: us-east-1

scrape_configs:
  - job_name: 'chioma-backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### 2. Application Metrics

#### HTTP Request Metrics

```typescript
// Automatically instrumented by Prometheus middleware
http_requests_total{
  method="GET",
  route="/api/properties",
  status="200"
}

http_request_duration_seconds{
  method="GET",
  route="/api/properties",
  le="0.1"
}

http_requests_in_flight{
  method="GET",
  route="/api/properties"
}
```

#### Database Metrics

```typescript
// Instrumented via TypeORM hooks
db_query_duration_seconds{
  operation="SELECT",
  table="properties",
  le="0.05"
}

db_connections_active{
  pool="default"
}

db_connections_idle{
  pool="default"
}

db_query_errors_total{
  operation="INSERT",
  error_type="constraint_violation"
}
```

#### Cache Metrics

```typescript
// Instrumented via Redis client wrapper
redis_commands_total{
  command="GET",
  status="success"
}

redis_command_duration_seconds{
  command="GET",
  le="0.01"
}

redis_cache_hits_total{
  key_pattern="property:*"
}

redis_cache_misses_total{
  key_pattern="property:*"
}
```

#### Queue Metrics

```typescript
// Instrumented via Bull queue hooks
queue_jobs_total{
  queue="email",
  status="completed"
}

queue_jobs_active{
  queue="email"
}

queue_jobs_waiting{
  queue="email"
}

queue_jobs_failed{
  queue="email",
  reason="timeout"
}

queue_job_duration_seconds{
  queue="email",
  le="5"
}
```

#### Business Metrics

```typescript
// Custom instrumentation
users_registered_total{
  source="web"
}

properties_listed_total{
  property_type="apartment"
}

agreements_signed_total{
  status="active"
}

escrow_transactions_total{
  status="completed",
  currency="USD"
}

disputes_created_total{
  priority="high"
}
```

### 3. Infrastructure Metrics

#### Host Metrics (Node Exporter)

```
node_cpu_seconds_total{cpu="0",mode="user"}
node_memory_MemAvailable_bytes
node_memory_MemTotal_bytes
node_disk_io_reads_completed_total{device="sda"}
node_disk_io_writes_completed_total{device="sda"}
node_filesystem_avail_bytes{mountpoint="/"}
node_network_receive_bytes_total{device="eth0"}
node_network_transmit_bytes_total{device="eth0"}
```

#### Container Metrics (cAdvisor)

```
container_cpu_usage_seconds_total{container_name="chioma-backend"}
container_memory_usage_bytes{container_name="chioma-backend"}
container_network_receive_bytes_total{container_name="chioma-backend"}
container_fs_usage_bytes{container_name="chioma-backend"}
```

### 4. Database Metrics

#### PostgreSQL Metrics

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Query performance
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Cache hit ratio
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### Replication Metrics (if applicable)

```
pg_replication_lag_seconds
pg_replication_slots_active
pg_replication_slots_retained_bytes
```

### 5. Cache Metrics

#### Redis Metrics

```
redis_memory_used_bytes
redis_memory_max_bytes
redis_memory_fragmentation_ratio
redis_keyspace_keys_total{db="0"}
redis_keyspace_expires_total{db="0"}
redis_keyspace_avg_ttl_seconds{db="0"}
redis_commands_processed_total
redis_connected_clients
redis_evicted_keys_total
redis_expired_keys_total
```

### 6. External Dependency Metrics

#### Stellar RPC Metrics

```typescript
stellar_rpc_requests_total{
  method="getTransaction",
  status="success"
}

stellar_rpc_request_duration_seconds{
  method="getTransaction",
  le="1"
}

stellar_rpc_errors_total{
  method="getTransaction",
  error_type="timeout"
}
```

#### Third-Party API Metrics

```typescript
tenant_screening_api_requests_total{
  endpoint="/verify",
  status="200"
}

tenant_screening_api_duration_seconds{
  endpoint="/verify",
  le="2"
}

payment_gateway_requests_total{
  operation="charge",
  status="success"
}
```

### 7. Metrics Retention and Storage

#### Retention Policy

```yaml
# Prometheus retention
--storage.tsdb.retention.time=90d
--storage.tsdb.retention.size=50GB

# Downsampling rules
- source_labels: [__name__]
  regex: 'http_request_duration_seconds_bucket'
  action: drop
  # Keep only summary metrics after 30 days
```

#### Storage Optimization

- Use appropriate scrape intervals (15s for critical, 60s for others)
- Drop unnecessary metrics at scrape time
- Implement metric relabeling to reduce cardinality
- Archive old metrics to long-term storage

---

## Event Monitoring

### 1. Event Types

#### System Events

- Service startup/shutdown
- Configuration changes
- Deployment events
- Scaling events
- Backup/restore operations

#### Application Events

- User registration
- Authentication events
- API errors
- Business transactions
- State transitions

#### Infrastructure Events

- Container restarts
- Host failures
- Network issues
- Storage issues
- Resource exhaustion

### 2. Event Collection

#### Structured Logging

```typescript
// Winston logger configuration
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'chioma-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log with context
logger.info('User registered', {
  userId: user.id,
  email: user.email,
  source: 'web',
  timestamp: new Date().toISOString(),
});
```

#### Event Schema

```typescript
interface LogEvent {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  requestId: string;
  userId?: string;
  action: string;
  resource?: string;
  status: string;
  duration?: number;
  error?: {
    message: string;
    stack: string;
    code: string;
  };
  metadata?: Record<string, any>;
}
```

### 3. Event Aggregation

#### Log Aggregation Stack

```
Application Logs
      ↓
  Promtail
      ↓
  Loki
      ↓
  Grafana
```

#### Promtail Configuration

```yaml
# backend/monitoring/promtail/promtail-config.yml
clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker: {}
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
      - source_labels: ['__meta_docker_container_label_service']
        target_label: 'service'
```

### 4. Event Queries

#### Common Event Queries

```logql
# All errors in last hour
{service="chioma-backend"} | json | level="error" | __error__=""

# Errors by endpoint
{service="chioma-backend"} | json | level="error" | pattern `<_> <endpoint> <_>`

# User registration events
{service="chioma-backend"} | json | action="user_registered"

# Slow requests
{service="chioma-backend"} | json | duration > 1000

# Failed transactions
{service="chioma-backend"} | json | action="transaction" | status="failed"
```

---

## Alerting Strategy

### 1. Alert Design Principles

#### Actionable Alerts

- Every alert requires human action
- Clear description of problem
- Suggested remediation steps
- Runbook link included

#### Specific Alerts

- Alert on symptoms, not causes
- Avoid cascading alerts
- Use inhibition rules
- Minimize false positives

#### Urgent Alerts

- Only page for active customer impact
- Use severity levels appropriately
- Respect on-call schedules

### 2. Alert Severity Levels

| Severity | Impact           | Response  | Example             |
| -------- | ---------------- | --------- | ------------------- |
| Critical | Service down     | Immediate | Service unreachable |
| High     | Degraded service | 15 min    | Error rate > 5%     |
| Medium   | Warning          | 1 hour    | Memory usage > 85%  |
| Low      | Informational    | Next day  | Disk usage > 70%    |

### 3. Core Alert Rules

#### Service Health Alerts

```yaml
- alert: ServiceDown
  expr: up{job="chioma-backend"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: 'Chioma backend is down'
    description: 'Backend service {{ $labels.instance }} has been unreachable for 1 minute'
    runbook: 'https://docs.chioma.io/runbooks/service-down'

- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m])) 
    / 
    sum(rate(http_requests_total[5m])) > 0.05
  for: 5m
  labels:
    severity: high
  annotations:
    summary: 'High error rate detected'
    description: 'Error rate is {{ $value | humanizePercentage }} over 5 minutes'
    runbook: 'https://docs.chioma.io/runbooks/high-error-rate'

- alert: HighLatency
  expr: |
    histogram_quantile(0.95, 
      rate(http_request_duration_seconds_bucket[5m])
    ) > 2
  for: 10m
  labels:
    severity: high
  annotations:
    summary: 'High request latency detected'
    description: 'P95 latency is {{ $value }}s'
    runbook: 'https://docs.chioma.io/runbooks/high-latency'
```

#### Database Alerts

```yaml
- alert: DatabaseConnectionPoolExhausted
  expr: |
    db_connections_active / 
    (db_connections_active + db_connections_idle) > 0.9
  for: 5m
  labels:
    severity: high
  annotations:
    summary: 'Database connection pool near exhaustion'
    description: '{{ $value | humanizePercentage }} of connections in use'

- alert: SlowQueries
  expr: |
    histogram_quantile(0.95, 
      rate(db_query_duration_seconds_bucket[5m])
    ) > 1
  for: 10m
  labels:
    severity: medium
  annotations:
    summary: 'Slow database queries detected'
    description: 'P95 query time is {{ $value }}s'

- alert: DatabaseReplicationLag
  expr: pg_replication_lag_seconds > 10
  for: 5m
  labels:
    severity: high
  annotations:
    summary: 'Database replication lag high'
    description: 'Replication lag is {{ $value }}s'
```

#### Cache Alerts

```yaml
- alert: RedisMemoryHigh
  expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
  for: 10m
  labels:
    severity: medium
  annotations:
    summary: 'Redis memory usage high'
    description: 'Redis using {{ $value | humanizePercentage }} of max memory'

- alert: RedisCacheHitRateLow
  expr: |
    sum(rate(redis_cache_hits_total[5m])) 
    / 
    (sum(rate(redis_cache_hits_total[5m])) + sum(rate(redis_cache_misses_total[5m]))) < 0.5
  for: 15m
  labels:
    severity: medium
  annotations:
    summary: 'Redis cache hit rate low'
    description: 'Cache hit rate is {{ $value | humanizePercentage }}'
```

#### Queue Alerts

```yaml
- alert: QueueBacklogGrowing
  expr: deriv(queue_jobs_waiting[10m]) > 10
  for: 15m
  labels:
    severity: medium
  annotations:
    summary: 'Queue backlog growing'
    description: 'Queue {{ $labels.queue }} backlog increasing'

- alert: HighJobFailureRate
  expr: |
    sum(rate(queue_jobs_failed[5m])) 
    / 
    sum(rate(queue_jobs_total[5m])) > 0.1
  for: 10m
  labels:
    severity: high
  annotations:
    summary: 'High background job failure rate'
    description: '{{ $value | humanizePercentage }} of jobs failing'
```

#### Infrastructure Alerts

```yaml
- alert: DiskSpaceLow
  expr: |
    (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
  for: 5m
  labels:
    severity: high
  annotations:
    summary: 'Disk space low on {{ $labels.instance }}'
    description: 'Only {{ $value | humanizePercentage }} space remaining'

- alert: HighCPUUsage
  expr: |
    (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) > 0.8
  for: 10m
  labels:
    severity: medium
  annotations:
    summary: 'High CPU usage on {{ $labels.instance }}'
    description: 'CPU usage is {{ $value | humanizePercentage }}'

- alert: HighMemoryUsage
  expr: |
    (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.85
  for: 10m
  labels:
    severity: medium
  annotations:
    summary: 'High memory usage on {{ $labels.instance }}'
    description: 'Memory usage is {{ $value | humanizePercentage }}'
```

### 4. Alert Routing

```yaml
# backend/monitoring/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: 'default'
  group_by: ['alertname', 'severity', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
      repeat_interval: 1h

    - match:
        severity: high
      receiver: 'on-call-slack'
      continue: true
      repeat_interval: 2h

    - match:
        severity: medium
      receiver: 'team-channel'
      repeat_interval: 6h

    - match:
        severity: low
      receiver: 'email'
      repeat_interval: 24h

receivers:
  - name: 'default'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'

  - name: 'on-call-slack'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#on-call'

  - name: 'team-channel'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#chioma-alerts'

  - name: 'email'
    email_configs:
      - to: 'team@chioma.io'
        from: 'alerts@chioma.io'
        smarthost: 'smtp.gmail.com:587'
        auth_username: '${SMTP_USERNAME}'
        auth_password: '${SMTP_PASSWORD}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'high'
    equal: ['instance']

  - source_match:
      alertname: 'ServiceDown'
    target_match_re:
      alertname: '(HighErrorRate|HighLatency|DatabaseConnectionPoolExhausted)'
    equal: ['instance']
```

---

## Observability Best Practices

### 1. Instrumentation Best Practices

#### Metric Naming

```
<namespace>_<subsystem>_<name>_<unit>

Examples:
- http_requests_total
- db_query_duration_seconds
- redis_memory_used_bytes
- queue_jobs_active
```

#### Label Design

```typescript
// Good: Low cardinality labels
http_requests_total{
  method="GET",
  route="/api/properties",
  status="200"
}

// Bad: High cardinality labels
http_requests_total{
  user_id="12345",
  request_id="abc-def-ghi"
}
```

#### Instrumentation Points

- HTTP request entry/exit
- Database query execution
- Cache operations
- Queue job processing
- External API calls
- Business transactions
- Error conditions

### 2. Logging Best Practices

#### Structured Logging

```typescript
// Good
logger.info('User registered', {
  userId: user.id,
  email: user.email,
  source: 'web',
  timestamp: new Date().toISOString(),
});

// Bad
logger.info(`User ${user.id} registered from web`);
```

#### Log Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARN**: Warning conditions
- **ERROR**: Error conditions
- **FATAL**: Fatal errors requiring immediate attention

#### Sensitive Data

```typescript
// Redact sensitive information
const sanitizeUser = (user: User) => ({
  ...user,
  email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
  phone: user.phone?.replace(/(.{2})(.*)(.{2})/, '$1***$3'),
});

logger.info('User action', { user: sanitizeUser(user) });
```

### 3. Tracing Best Practices

#### Request Context

```typescript
// Propagate request ID through system
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || generateId();
  res.setHeader('x-request-id', req.id);
  next();
});

// Include in all logs
logger.info('Processing request', {
  requestId: req.id,
  method: req.method,
  path: req.path,
});
```

#### Distributed Tracing

```typescript
// Instrument external calls
const span = tracer.startSpan('stellar_rpc_call', {
  attributes: {
    'rpc.method': 'getTransaction',
    'rpc.network': 'testnet',
  },
});

try {
  const result = await stellarClient.getTransaction(txHash);
  span.setStatus({ code: SpanStatusCode.OK });
  return result;
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
} finally {
  span.end();
}
```

### 4. Dashboard Best Practices

#### Dashboard Organization

- One dashboard per operational concern
- Consistent time ranges and refresh rates
- Clear titles and descriptions
- Drill-down capability
- Annotation support

#### Key Metrics to Display

- Request rate and latency
- Error rate and types
- Resource utilization
- Queue depth and processing time
- Business metrics

### 5. Alert Best Practices

#### Alert Naming

```
<Service><Condition><Severity>

Examples:
- BackendHighErrorRate
- DatabaseConnectionPoolExhausted
- RedisMemoryHigh
```

#### Alert Descriptions

```
Summary: One-line description of the problem
Description: Detailed explanation with current value
Runbook: Link to troubleshooting guide
```

#### Alert Tuning

- Review alert volume weekly
- Adjust thresholds based on historical data
- Eliminate false positives
- Test alerts in staging before production

---

## Implementation Guide

### 1. Setup Monitoring Stack

```bash
# Start monitoring stack
cd backend
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services
curl http://localhost:9090  # Prometheus
curl http://localhost:3000  # Grafana
curl http://localhost:3100  # Loki
```

### 2. Configure Application Instrumentation

```typescript
// src/main.ts
import { register } from 'prom-client';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
      defaultLabels: {
        app: 'chioma-backend',
        environment: process.env.NODE_ENV,
      },
    }),
  ],
})
export class AppModule {}
```

### 3. Create Dashboards

```bash
# Import dashboard JSON
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @backend/monitoring/grafana/provisioning/dashboards/service-overview.json
```

### 4. Configure Alerts

```bash
# Reload Prometheus configuration
curl -X POST http://localhost:9090/-/reload
```

### 5. Setup Alert Routing

```bash
# Configure Alertmanager
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d @backend/monitoring/alertmanager/alertmanager.yml
```

---

## Troubleshooting

### Metrics Not Appearing

1. Check Prometheus targets: `http://localhost:9090/targets`
2. Verify `/metrics` endpoint: `curl http://localhost:5000/metrics`
3. Check scrape logs: `docker logs prometheus`
4. Verify network connectivity between Prometheus and targets

### Alerts Not Firing

1. Check alert rules: `http://localhost:9090/alerts`
2. Verify metric availability
3. Check alert evaluation: `http://localhost:9090/graph`
4. Review Alertmanager logs: `docker logs alertmanager`

### High Cardinality Issues

1. Identify high-cardinality metrics: `http://localhost:9090/tsdb-status`
2. Add metric relabeling to drop unnecessary labels
3. Implement cardinality limits
4. Archive old metrics

### Performance Issues

1. Increase Prometheus memory: `--storage.tsdb.max-block-duration=2h`
2. Reduce scrape interval for non-critical metrics
3. Implement metric downsampling
4. Use remote storage for long-term retention

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Observability Engineering](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)
- [The Three Pillars of Observability](https://www.oreilly.com/library/view/distributed-systems-observability/9781492033431/)
