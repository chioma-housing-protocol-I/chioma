# Alerting Rules for Critical Errors and Performance

This document describes the comprehensive alerting rules configured for the Chioma backend, covering critical errors, performance issues, and business logic failures.

## Overview

The alerting system is built on:

- **Prometheus**: Metrics collection and evaluation
- **AlertManager**: Alert routing and deduplication
- **Grafana**: Alert visualization and dashboards
- **Webhook Integration**: Custom alert handling in the backend

## Alert Severity Levels

### Critical (Immediate Action Required)

- **Response Time**: Immediate notification
- **Escalation**: Page on-call engineer
- **SLA**: 5-minute response time
- **Examples**: Service down, data loss, security breach

### Warning (Investigation Recommended)

- **Response Time**: Within 15 minutes
- **Escalation**: Notify team lead
- **SLA**: 30-minute response time
- **Examples**: High latency, resource constraints, backlog

### Info (Informational)

- **Response Time**: No immediate action
- **Escalation**: Log for analysis
- **SLA**: None
- **Examples**: Deployment events, configuration changes

## Critical Alerts

### 1. HighErrorRate

**Condition**: Error rate > 5% for 2 minutes

**Metrics**:

```promql
(
  sum(rate(http_requests_total{status=~"5.."}[5m])) /
  sum(rate(http_requests_total[5m]))
) > 0.05
```

**Causes**:

- Database connectivity issues
- External service failures (Stellar, Anchor)
- Code bugs or exceptions
- Resource exhaustion

**Investigation**:

```bash
# Check error logs
kubectl logs -n production -l app=chioma-backend | grep ERROR

# Check error rate by endpoint
curl http://prometheus:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m]) by (path)'

# Check error rate by status code
curl http://prometheus:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m]) by (status)'
```

**Resolution**:

1. Check application logs for error messages
2. Verify database connectivity
3. Check external service status
4. Review recent deployments
5. Scale up if resource-constrained

### 2. CriticalExceptionRate

**Condition**: Critical exceptions > 0.1/s for 1 minute

**Metrics**:

```promql
sum(rate(exceptions_total{severity="critical"}[5m])) > 0.1
```

**Causes**:

- Unhandled exceptions in code
- Invalid input data
- Resource allocation failures
- Timeout errors

**Investigation**:

```bash
# Check exception logs
kubectl logs -n production -l app=chioma-backend | grep "CRITICAL"

# Check exception rate by type
curl http://prometheus:9090/api/v1/query?query='rate(exceptions_total{severity="critical"}[5m]) by (type)'

# Check exception stack traces
kubectl logs -n production -l app=chioma-backend | grep -A 5 "Exception"
```

**Resolution**:

1. Review exception stack traces
2. Identify root cause
3. Deploy fix or workaround
4. Monitor for recurrence

### 3. DatabaseConnectionPoolExhausted

**Condition**: > 90% of connections in use for 2 minutes

**Metrics**:

```promql
(
  db_pool_active_connections / db_pool_max_connections
) > 0.9
```

**Causes**:

- Slow queries holding connections
- Connection leaks
- High traffic spike
- Insufficient pool size

**Investigation**:

```bash
# Check active connections
curl http://prometheus:9090/api/v1/query?query='db_pool_active_connections'

# Check connection trend
curl http://prometheus:9090/api/v1/query_range?query='db_pool_active_connections'&start=<time>&end=<time>&step=60s

# Check for slow queries
kubectl exec -it <pod-name> -n production -- npm run db:monitor:health
```

**Resolution**:

1. Identify slow queries
2. Optimize query performance
3. Increase connection pool size
4. Scale up database resources
5. Implement connection pooling

### 4. DatabaseQueryTimeout

**Condition**: > 0.5 timeouts/s for 2 minutes

**Metrics**:

```promql
sum(rate(db_query_timeout_total[5m])) > 0.5
```

**Causes**:

- Slow queries
- Database overload
- Network latency
- Insufficient resources

**Investigation**:

```bash
# Check query timeout logs
kubectl logs -n production -l app=chioma-backend | grep "timeout"

# Check slow queries
curl http://prometheus:9090/api/v1/query?query='histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))'

# Check database performance
kubectl exec -it <pod-name> -n production -- npm run db:perf-report
```

**Resolution**:

1. Analyze slow queries
2. Add database indexes
3. Optimize query logic
4. Increase query timeout
5. Scale up database

### 5. RedisConnectionLost

**Condition**: No active Redis connections

**Metrics**:

```promql
redis_connected_clients == 0
```

**Causes**:

- Redis service down
- Network connectivity issue
- Redis configuration error
- Connection pool exhausted

**Investigation**:

```bash
# Check Redis connectivity
kubectl exec -it <pod-name> -n production -- redis-cli ping

# Check Redis logs
kubectl logs -n production -l app=redis

# Check connection errors
kubectl logs -n production -l app=chioma-backend | grep "redis"
```

**Resolution**:

1. Verify Redis service is running
2. Check network connectivity
3. Review Redis configuration
4. Restart Redis if necessary
5. Implement connection retry logic

### 6. OutOfMemory

**Condition**: Memory usage > 1.5GB for 2 minutes

**Metrics**:

```promql
(
  process_resident_memory_bytes / 1024 / 1024 / 1024
) > 1.5
```

**Causes**:

- Memory leak
- Large data structures
- Inefficient algorithms
- Insufficient memory allocation

**Investigation**:

```bash
# Check memory trend
curl http://prometheus:9090/api/v1/query_range?query='process_resident_memory_bytes'&start=<time>&end=<time>&step=60s

# Check for memory leaks
kubectl exec -it <pod-name> -n production -- npm run test:leaks

# Check heap usage
kubectl exec -it <pod-name> -n production -- node --inspect
```

**Resolution**:

1. Restart affected pods
2. Implement memory profiling
3. Identify memory leaks
4. Optimize data structures
5. Increase memory limits

### 7. PaymentProcessingFailure

**Condition**: Payment errors > 0.1/s for 2 minutes

**Metrics**:

```promql
sum(rate(payment_processing_errors_total[5m])) > 0.1
```

**Causes**:

- Payment gateway down
- Invalid payment data
- Insufficient funds
- Network issues

**Investigation**:

```bash
# Check payment error logs
kubectl logs -n production -l app=chioma-backend | grep "payment"

# Check payment error rate by type
curl http://prometheus:9090/api/v1/query?query='rate(payment_processing_errors_total[5m]) by (error_type)'

# Check payment gateway status
curl https://api.payment-gateway.com/status
```

**Resolution**:

1. Check payment gateway status
2. Review payment error logs
3. Verify payment configuration
4. Contact payment provider if needed
5. Implement retry logic

### 8. StellarBlockchainUnavailable

**Condition**: > 10 Stellar API errors in 5 minutes

**Metrics**:

```promql
stellar_api_errors_total > 10
```

**Causes**:

- Stellar network down
- API rate limit exceeded
- Network connectivity issue
- Invalid API key

**Investigation**:

```bash
# Check Stellar API errors
kubectl logs -n production -l app=chioma-backend | grep "stellar"

# Check Stellar network status
curl https://status.stellar.org

# Check API rate limits
curl http://prometheus:9090/api/v1/query?query='stellar_api_rate_limit_remaining'
```

**Resolution**:

1. Check Stellar network status
2. Verify API credentials
3. Check rate limits
4. Implement exponential backoff
5. Contact Stellar support if needed

### 9. ServiceDown

**Condition**: Service unreachable for 1 minute

**Metrics**:

```promql
up{job="chioma-backend"} == 0
```

**Causes**:

- Application crashed
- Container exited
- Pod evicted
- Network issue

**Investigation**:

```bash
# Check pod status
kubectl get pods -n production -l app=chioma-backend

# Check pod events
kubectl describe pod <pod-name> -n production

# Check pod logs
kubectl logs <pod-name> -n production

# Check node status
kubectl get nodes
```

**Resolution**:

1. Check pod status and events
2. Review application logs
3. Restart pod if necessary
4. Check node resources
5. Review recent deployments

### 10. HealthCheckFailing

**Condition**: Health check endpoint failing for 2 minutes

**Metrics**:

```promql
health_check_status != 1
```

**Causes**:

- Database connectivity issue
- Redis connectivity issue
- External service down
- Application error

**Investigation**:

```bash
# Check health endpoint
curl http://localhost:3000/health

# Check detailed health
curl http://localhost:3000/health/detailed

# Check health logs
kubectl logs -n production -l app=chioma-backend | grep "health"
```

**Resolution**:

1. Check health endpoint response
2. Verify database connectivity
3. Verify Redis connectivity
4. Check external services
5. Review application logs

### 11. DatabaseUnreachable

**Condition**: > 5 database connection errors in 2 minutes

**Metrics**:

```promql
db_connection_errors_total > 5
```

**Causes**:

- Database service down
- Network connectivity issue
- Invalid credentials
- Connection pool exhausted

**Investigation**:

```bash
# Check database connectivity
kubectl exec -it <pod-name> -n production -- nc -zv $DB_HOST $DB_PORT

# Check database logs
kubectl logs -n production -l app=postgres

# Check connection errors
kubectl logs -n production -l app=chioma-backend | grep "connection"
```

**Resolution**:

1. Verify database service is running
2. Check network connectivity
3. Verify credentials
4. Check connection pool
5. Restart database if necessary

### 12. EscrowTransactionFailure

**Condition**: Escrow failures > 0.05/s for 2 minutes

**Metrics**:

```promql
sum(rate(escrow_transaction_failures_total[5m])) > 0.05
```

**Causes**:

- Blockchain network issue
- Invalid transaction data
- Insufficient funds
- Smart contract error

**Investigation**:

```bash
# Check escrow error logs
kubectl logs -n production -l app=chioma-backend | grep "escrow"

# Check escrow error rate by type
curl http://prometheus:9090/api/v1/query?query='rate(escrow_transaction_failures_total[5m]) by (error_type)'

# Check blockchain status
curl https://horizon.stellar.org/
```

**Resolution**:

1. Check blockchain network status
2. Review escrow error logs
3. Verify transaction data
4. Check smart contract
5. Implement retry logic

## Warning Alerts

### 1. HighResponseTime

**Condition**: P95 response time > 1 second for 5 minutes

**Metrics**:

```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1.0
```

**Investigation**:

```bash
# Check response time by endpoint
curl http://prometheus:9090/api/v1/query?query='histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) by (path)'

# Check slow queries
curl http://prometheus:9090/api/v1/query?query='histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))'
```

**Resolution**:

1. Identify slow endpoints
2. Optimize database queries
3. Implement caching
4. Scale up resources

### 2. HighCPUUsage

**Condition**: CPU > 80% for 5 minutes

**Metrics**:

```promql
rate(process_cpu_seconds_total[5m]) > 0.8
```

**Investigation**:

```bash
# Check CPU usage trend
curl http://prometheus:9090/api/v1/query_range?query='rate(process_cpu_seconds_total[5m])'&start=<time>&end=<time>&step=60s

# Check CPU usage by endpoint
curl http://prometheus:9090/api/v1/query?query='rate(process_cpu_seconds_total[5m]) by (path)'
```

**Resolution**:

1. Identify CPU-intensive operations
2. Optimize algorithms
3. Implement caching
4. Scale up resources

### 3. SlowDatabaseQueries

**Condition**: P95 query time > 500ms for 5 minutes

**Metrics**:

```promql
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.5
```

**Investigation**:

```bash
# Check slow queries
kubectl exec -it <pod-name> -n production -- npm run db:perf-report

# Check query execution plans
kubectl exec -it <pod-name> -n production -- psql -c "EXPLAIN ANALYZE <query>"
```

**Resolution**:

1. Analyze slow queries
2. Add database indexes
3. Optimize query logic
4. Implement query caching

### 4. HighDatabaseConnections

**Condition**: > 70% of connections in use for 5 minutes

**Metrics**:

```promql
(
  db_pool_active_connections / db_pool_max_connections
) > 0.7
```

**Investigation**:

```bash
# Check active connections
curl http://prometheus:9090/api/v1/query?query='db_pool_active_connections'

# Check connection trend
curl http://prometheus:9090/api/v1/query_range?query='db_pool_active_connections'&start=<time>&end=<time>&step=60s
```

**Resolution**:

1. Identify long-running queries
2. Optimize query performance
3. Increase connection pool size
4. Scale up database

### 5. RedisCacheHitRateLow

**Condition**: Cache hit rate < 70% for 10 minutes

**Metrics**:

```promql
(
  redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)
) < 0.7
```

**Investigation**:

```bash
# Check cache hit rate
curl http://prometheus:9090/api/v1/query?query='redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)'

# Check cache evictions
curl http://prometheus:9090/api/v1/query?query='redis_evicted_keys_total'
```

**Resolution**:

1. Increase Redis memory
2. Optimize cache key strategy
3. Implement cache warming
4. Review cache TTL

### 6. HighMemoryUsage

**Condition**: Memory > 1GB for 5 minutes

**Metrics**:

```promql
(
  process_resident_memory_bytes / 1024 / 1024 / 1024
) > 1.0
```

**Investigation**:

```bash
# Check memory trend
curl http://prometheus:9090/api/v1/query_range?query='process_resident_memory_bytes'&start=<time>&end=<time>&step=60s

# Check for memory leaks
kubectl exec -it <pod-name> -n production -- npm run test:leaks
```

**Resolution**:

1. Monitor memory trend
2. Implement memory profiling
3. Optimize data structures
4. Increase memory limits

### 7. AuthenticationFailureRate

**Condition**: Auth failures > 1/s for 5 minutes

**Metrics**:

```promql
sum(rate(auth_failures_total[5m])) > 1.0
```

**Investigation**:

```bash
# Check auth error logs
kubectl logs -n production -l app=chioma-backend | grep "auth"

# Check auth failure rate by type
curl http://prometheus:9090/api/v1/query?query='rate(auth_failures_total[5m]) by (error_type)'
```

**Resolution**:

1. Check authentication logs
2. Verify JWT configuration
3. Check user credentials
4. Implement rate limiting

### 8. RateLimitExceeded

**Condition**: Rate limit violations > 10/s for 5 minutes

**Metrics**:

```promql
sum(rate(rate_limit_exceeded_total[5m])) > 10
```

**Investigation**:

```bash
# Check rate limit violations by client
curl http://prometheus:9090/api/v1/query?query='rate(rate_limit_exceeded_total[5m]) by (client_ip)'

# Check rate limit violations by endpoint
curl http://prometheus:9090/api/v1/query?query='rate(rate_limit_exceeded_total[5m]) by (path)'
```

**Resolution**:

1. Identify clients exceeding limits
2. Adjust rate limits if needed
3. Implement client-specific limits
4. Block abusive clients

### 9. WebhookDeliveryFailure

**Condition**: Webhook failures > 0.1/s for 5 minutes

**Metrics**:

```promql
sum(rate(webhook_delivery_failures_total[5m])) > 0.1
```

**Investigation**:

```bash
# Check webhook error logs
kubectl logs -n production -l app=chioma-backend | grep "webhook"

# Check webhook failure rate by endpoint
curl http://prometheus:9090/api/v1/query?query='rate(webhook_delivery_failures_total[5m]) by (endpoint)'
```

**Resolution**:

1. Check webhook endpoint status
2. Verify webhook configuration
3. Implement retry logic
4. Check network connectivity

### 10. DisputeResolutionDelayed

**Condition**: > 100 pending disputes for 30 minutes

**Metrics**:

```promql
disputes_pending_resolution_count > 100
```

**Investigation**:

```bash
# Check pending disputes
curl http://prometheus:9090/api/v1/query?query='disputes_pending_resolution_count'

# Check dispute resolution time
curl http://prometheus:9090/api/v1/query?query='disputes_resolution_time_seconds'
```

**Resolution**:

1. Review pending disputes
2. Prioritize high-value disputes
3. Allocate more resources
4. Implement automated resolution

### 11. KYCVerificationBacklog

**Condition**: > 50 pending KYC verifications for 30 minutes

**Metrics**:

```promql
kyc_pending_verification_count > 50
```

**Investigation**:

```bash
# Check pending KYC verifications
curl http://prometheus:9090/api/v1/query?query='kyc_pending_verification_count'

# Check KYC verification time
curl http://prometheus:9090/api/v1/query?query='kyc_verification_time_seconds'
```

**Resolution**:

1. Review pending verifications
2. Allocate more resources
3. Implement automated verification
4. Prioritize high-value users

### 12. DiskSpaceRunningLow

**Condition**: < 10% disk space available for 5 minutes

**Metrics**:

```promql
(
  node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}
) < 0.1
```

**Investigation**:

```bash
# Check disk usage
df -h

# Check large files
du -sh /*

# Check log files
du -sh /var/log/*
```

**Resolution**:

1. Clean up old logs
2. Remove temporary files
3. Expand disk space
4. Implement log rotation

### 13. FileDescriptorLimitApproaching

**Condition**: > 80% of FD limit for 5 minutes

**Metrics**:

```promql
(
  process_open_fds / process_max_fds
) > 0.8
```

**Investigation**:

```bash
# Check open file descriptors
lsof -p <pid> | wc -l

# Check FD limit
ulimit -n

# Check FD usage by process
lsof -p <pid> | head -20
```

**Resolution**:

1. Increase FD limit
2. Close unused connections
3. Implement connection pooling
4. Review file handling

## Alert Configuration

### Prometheus Configuration

Alerts are defined in `backend/monitoring/prometheus/alerts.yml`:

```yaml
groups:
  - name: chioma_backend_alerts
    interval: 15s
    rules:
      - alert: HighErrorRate
        expr: ...
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: '...'
          description: '...'
```

### AlertManager Configuration

Routing is configured in `backend/monitoring/alertmanager/alertmanager.yml`:

```yaml
route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
    - match:
        severity: warning
      receiver: 'warning'
```

## Webhook Integration

Alerts are sent to the backend webhook endpoint:

```
POST /api/alerts/webhook
```

**Payload**:

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

## Best Practices

1. **Set Appropriate Thresholds**: Based on SLA and business requirements
2. **Use Multiple Metrics**: Combine metrics for better accuracy
3. **Implement Runbooks**: Document resolution steps for each alert
4. **Test Alerts**: Regularly test alert firing and routing
5. **Monitor Alert Fatigue**: Adjust thresholds to reduce false positives
6. **Document Changes**: Track alert configuration changes
7. **Review Regularly**: Quarterly review of alert effectiveness

## References

- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [AlertManager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/)
