# Monitoring Setup Guide

Practical guide for running, verifying, and operating the Chioma backend monitoring stack.

For deeper reference see:

- [Logging & Monitoring](./LOGGING_AND_MONITORING.md) — logging architecture, Sentry, structured logs
- [Comprehensive Monitoring](./COMPREHENSIVE_MONITORING.md) — observability strategy, metrics catalogue
- [Monitoring & Alerting Runbook](./deployment/MONITORING_AND_ALERTING.md) — alert response, escalation, tuning

---

## Stack Overview

| Component    | Role                            | Port  |
| ------------ | ------------------------------- | ----- |
| Prometheus   | Metrics scraping and storage    | 9090  |
| Grafana      | Dashboards and visualization    | 3001  |
| Loki         | Log aggregation                 | 3100  |
| Promtail     | Log shipping to Loki            | 9080  |
| Alertmanager | Alert routing and deduplication | 9093  |
| Jaeger       | Distributed tracing             | 16686 |

All services are defined in `backend/docker-compose.monitoring.yml`.

---

## Quick Start

```bash
# From the backend directory
cd backend

# Start the full monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Verify all containers are running
docker compose -f docker-compose.monitoring.yml ps
```

Open the UIs:

- Grafana: http://localhost:3001 (admin / admin)
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Jaeger: http://localhost:16686

---

## Application Metrics Endpoint

The backend exposes metrics at `GET /metrics`. Prometheus scrapes this endpoint every 15 seconds.

```bash
# Verify the endpoint is reachable (backend must be running)
curl http://localhost:3000/metrics
```

Expected output starts with:

```
# Chioma Backend Metrics
```

Metrics are recorded by `MetricsService` (`src/modules/monitoring/metrics.service.ts`) and collected by `MetricsMiddleware` on every request.

### Available Metrics

| Metric prefix           | Type      | Description                            |
| ----------------------- | --------- | -------------------------------------- |
| `http_requests_*`       | Counter   | Request count by method, route, status |
| `http_duration_*`       | Histogram | Request latency (avg, count)           |
| `blockchain_tx_*`       | Counter   | Blockchain transactions by type/status |
| `blockchain_failure_*`  | Counter   | Blockchain failures by type            |
| `blockchain_duration_*` | Histogram | Blockchain operation latency           |
| `database_connections`  | Gauge     | Active database connections            |
| `db_query_*`            | Histogram | Database query latency by type         |
| `rent_payment_*`        | Counter   | Rent payment outcomes                  |
| `nft_mint_*`            | Counter   | NFT mints by type                      |
| `dispute_*`             | Counter   | Disputes by type and status            |

### Recording Custom Metrics

Inject `MetricsService` into any NestJS provider:

```typescript
import { MetricsService } from '../monitoring/metrics.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly metrics: MetricsService) {}

  async processPayment(id: string) {
    try {
      // ... payment logic
      this.metrics.recordRentPayment('success');
      this.metrics.recordBlockchainTransaction('payment', 'success');
    } catch (err) {
      this.metrics.recordRentPayment('failed');
      this.metrics.recordBlockchainFailure('payment', err.message);
    }
  }
}
```

---

## Alert Rules

Alert rules are defined in `backend/monitoring/prometheus/alerts.yml`.

| Alert                             | Condition                         | For | Severity |
| --------------------------------- | --------------------------------- | --- | -------- |
| `HighErrorRate`                   | 5xx rate > 0.05/sec               | 5m  | critical |
| `HighResponseTime`                | P95 latency > 1s                  | 5m  | warning  |
| `BlockchainTransactionFailure`    | Blockchain failure rate > 0.1/sec | 2m  | critical |
| `DatabaseConnectionPoolExhausted` | Active connections > 90% of max   | 5m  | warning  |

### Adding an Alert

Append to `backend/monitoring/prometheus/alerts.yml`:

```yaml
- alert: HighPaymentFailureRate
  expr: rate(rent_payment_failed[5m]) > 0.02
  for: 3m
  labels:
    severity: critical
  annotations:
    summary: 'High payment failure rate'
    description: '{{ $value }} payment failures per second'
```

Reload Prometheus to pick up the change:

```bash
curl -X POST http://localhost:9090/-/reload
```

---

## Alert Routing

Alertmanager config is at `backend/monitoring/alertmanager/alertmanager.yml`.

- `critical` alerts → `critical` receiver (webhook + `send_resolved: true`)
- `warning` alerts → `warning` receiver
- All receivers POST to `POST /api/alerts/webhook` on the backend

The backend's `AlertService` (`src/modules/monitoring/alert.service.ts`) handles incoming webhook payloads, logs them, and escalates critical alerts.

To add Slack or email notifications, add a receiver in `alertmanager.yml`:

```yaml
receivers:
  - name: 'slack-critical'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts-critical'
        send_resolved: true
```

Then reference it in the `routes` section.

---

## Log Aggregation

Promtail tails `backend/logs/*.log` and ships to Loki. The backend writes structured JSON logs to `logs/app.log` in production (`NODE_ENV=production`).

Query logs in Grafana (Explore → Loki datasource):

```logql
# All backend logs
{job="chioma-backend"}

# Errors only
{job="chioma-backend"} | json | level="ERROR"

# Logs for a specific request
{job="chioma-backend"} | json | correlationId="<uuid>"

# Slow requests (> 500ms)
{job="chioma-backend"} | json | responseTime > 500
```

---

## Health Checks

The backend exposes two health endpoints (excluded from logging middleware):

| Endpoint               | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `GET /health`          | Liveness — returns `{ status: "ok" }`           |
| `GET /health/detailed` | Readiness — checks database, Redis, Stellar RPC |

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/detailed
```

---

## Grafana Datasources

Grafana is pre-provisioned with three datasources (`backend/monitoring/grafana/provisioning/datasources/datasources.yml`):

| Name       | Type       | URL                    |
| ---------- | ---------- | ---------------------- |
| Prometheus | prometheus | http://prometheus:9090 |
| Loki       | loki       | http://loki:3100       |
| Jaeger     | jaeger     | http://jaeger:16686    |

No manual configuration is needed after `docker compose up`.

---

## Environment Variables

| Variable                     | Description                           | Default       |
| ---------------------------- | ------------------------------------- | ------------- |
| `SENTRY_DSN`                 | Sentry error tracking DSN             | _(disabled)_  |
| `SENTRY_ENVIRONMENT`         | Sentry environment tag                | `development` |
| `NODE_ENV`                   | Controls log output (file vs console) | `development` |
| `LOG_SLOW_REQUEST_THRESHOLD` | Slow request warning threshold (ms)   | `500`         |
| `ALERT_WEBHOOK_SECRET`       | HMAC secret for alert webhook auth    | _(required)_  |

---

## Stopping the Stack

```bash
docker compose -f docker-compose.monitoring.yml down

# Remove volumes (clears all stored metrics and logs)
docker compose -f docker-compose.monitoring.yml down -v
```
