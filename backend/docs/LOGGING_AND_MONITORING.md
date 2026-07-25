# Logging and Monitoring

This document covers the logging infrastructure, monitoring stack, alerting configuration, and observability practices used across the Chioma platform.

---

## Table of Contents

- [Logging Architecture](#logging-architecture)
- [Backend Logging](#backend-logging)
  - [LoggerService](#loggerservice)
  - [Logger Middleware](#logger-middleware)
  - [Logging Interceptor](#logging-interceptor)
  - [Sensitive Data Sanitization](#sensitive-data-sanitization)
  - [Log Levels](#log-levels)
  - [Structured Log Format](#structured-log-format)
  - [Correlation IDs](#correlation-ids)
- [Frontend Logging](#frontend-logging)
- [Sentry Integration](#sentry-integration)
- [Monitoring Stack](#monitoring-stack)
  - [Prometheus](#prometheus)
  - [Grafana](#grafana)
  - [Loki (Log Aggregation)](#loki-log-aggregation)
  - [Promtail (Log Shipping)](#promtail-log-shipping)
  - [Alertmanager](#alertmanager)
- [Alerts](#alerts)
- [Health Checks](#health-checks)
- [Running the Monitoring Stack](#running-the-monitoring-stack)
- [Best Practices](#best-practices)

---

## Logging Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  HTTP       │────▶│  Logger          │────▶│  Console     │ (development)
│  Request    │     │  Middleware       │     │  Output      │
└─────────────┘     └──────────────────┘     └──────────────┘
       │                    │
       ▼                    │                 ┌──────────────┐
┌─────────────┐             └────────────────▶│  File        │ (production)
│  Logging    │                               │  logs/app.log│
│  Interceptor│                               └──────┬───────┘
└─────────────┘                                      │
       │                                             ▼
       ▼                                      ┌──────────────┐
┌─────────────┐                               │  Promtail    │
│  Sentry     │                               │  (shipper)   │
│  Breadcrumbs│                               └──────┬───────┘
└─────────────┘                                      │
                                                     ▼
                                              ┌──────────────┐     ┌──────────┐
                                              │  Loki        │────▶│  Grafana │
                                              │  (storage)   │     │  (UI)    │
                                              └──────────────┘     └──────────┘

┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  /metrics   │────▶│  Prometheus  │────▶│  Alertmanager    │
│  endpoint   │     │  (scrape)    │     │  (notifications) │
└─────────────┘     └──────────────┘     └──────────────────┘
```

---

## Backend Logging

### LoggerService

**Location:** `backend/src/common/logger/logger.service.ts`

The custom `LoggerService` is a transient-scoped NestJS provider that produces structured JSON log entries. It is registered as the application-wide logger in `main.ts`.

**Log methods:**

| Method  | Level | Usage                                   |
| ------- | ----- | --------------------------------------- |
| `debug` | DEBUG | Verbose development output              |
| `info`  | INFO  | Normal operational events               |
| `warn`  | WARN  | Degraded conditions, slow requests      |
| `error` | ERROR | Request failures, caught exceptions     |
| `fatal` | FATAL | Unrecoverable conditions, process-level |

**Usage example:**

```typescript
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly logger: LoggerService) {}

  async processPayment(paymentId: string, userId: string) {
    this.logger.info('Processing payment', {
      service: 'PaymentsService',
      method: 'processPayment',
      userId,
      context: { paymentId },
    });
  }
}
```

**Output routing:**

| Environment | Destination          | Format |
| ----------- | -------------------- | ------ |
| Development | Console (stdout/err) | JSON   |
| Production  | `logs/app.log` file  | JSON   |

### Logger Middleware

**Location:** `backend/src/common/middleware/logger.middleware.ts`

Applied globally via `main.ts`, the middleware runs on every incoming request (except `/health`) and:

1. Generates or extracts a **correlation ID** from the `X-Request-ID` header
2. Sets the correlation ID on the response via `X-Request-ID`
3. Records timing via `process.hrtime()`
4. On response `finish`, emits a structured `HttpLog` entry with:
   - Method, URL, status code, response time, IP, user agent
   - Sanitized request/response headers and body
   - Automatic log level escalation:
     - `5xx` status → `ERROR`
     - `4xx` status or response > 500ms → `WARN`
     - All others → `INFO`

**Slow request threshold:** Configurable via `LOG_SLOW_REQUEST_THRESHOLD` env var (default: 500ms).

### Logging Interceptor

**Location:** `backend/src/common/interceptors/logging.interceptor.ts`

The interceptor adds a second logging layer with Sentry integration:

- Logs incoming requests with method, URL, correlation ID, user ID, sanitized body and headers
- On successful response: logs status code and duration
- On error: logs error details, stack trace, and adds a Sentry breadcrumb
- Sets Sentry scope context (request info) and user info when available

### Sensitive Data Sanitization

Both the middleware and interceptor automatically redact sensitive data before logging:

**Redacted headers:**

- `authorization`
- `cookie`
- `x-api-key`

**Redacted body fields:**

- `password`
- `token`
- `secret`

These fields appear as `[REDACTED]` in log output. Sanitization is applied recursively to nested objects.

### Log Levels

| Level | When to use                                    | Example                             |
| ----- | ---------------------------------------------- | ----------------------------------- |
| DEBUG | Development tracing, verbose internal state    | Cache key lookups, query parameters |
| INFO  | Normal operations, milestones                  | Payment processed, user registered  |
| WARN  | Degraded state, slow responses, client errors  | Rate limit approached, 4xx response |
| ERROR | Failures requiring investigation               | Database query failed, 5xx response |
| FATAL | Unrecoverable errors, service startup failures | Database connection failed, OOM     |

### Structured Log Format

Every log entry follows this JSON structure:

```json
{
  "timestamp": "2026-03-30T12:00:00.000Z",
  "level": "INFO",
  "service": "PaymentsService",
  "method": "processPayment",
  "userId": "usr_abc123",
  "requestId": "req_xyz789",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "trace_001",
  "duration": 142,
  "message": "Payment processed successfully",
  "context": { "paymentId": "pay_456", "amount": "100.00" }
}
```

For HTTP logs, the middleware produces an `HttpLog` object:

```json
{
  "timestamp": "2026-03-30T12:00:00.000Z",
  "level": "INFO",
  "method": "POST",
  "url": "/api/v1/payments",
  "statusCode": 201,
  "responseTime": 142,
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "requestHeaders": {
    "authorization": "[REDACTED]",
    "content-type": "application/json"
  },
  "requestBody": { "amount": "100.00", "password": "[REDACTED]" },
  "responseHeaders": { "x-request-id": "550e8400..." },
  "responseSize": "256"
}
```

### Correlation IDs

Every request is tagged with a correlation ID for end-to-end tracing:

1. The middleware checks for an incoming `X-Request-ID` header
2. If absent, a UUID is generated via `crypto.randomUUID()`
3. The ID is attached to the request object as `req.correlationId`
4. The ID is returned in the `X-Request-ID` response header
5. All log entries for that request include the correlation ID

**Tip:** Pass the same `X-Request-ID` from the frontend to trace requests across the full stack.

---

## Frontend Logging

**Location:** `frontend/lib/errors/logger.ts`

The frontend uses a lightweight error logger:

```typescript
logError(error: Error | AppError, context?: ErrorContext)
```

- Outputs structured error payloads to `console.error` with `[Chioma Error]` prefix
- Supports a pluggable external reporter via `window.__CHIOMA_ERROR_REPORTER__`
- Each payload includes: name, message, stack trace, context, and timestamp

To integrate an external error reporting service (e.g., Sentry browser SDK), assign a reporter function:

```typescript
window.__CHIOMA_ERROR_REPORTER__ = (payload) => {
  Sentry.captureException(new Error(payload.message), {
    extra: payload.context,
  });
};
```

---

## Sentry Integration

**Location:** `backend/src/main.ts` (initialization)

Sentry is initialized before any NestJS modules load:

| Setting            | Development                                   | Production                   |
| ------------------ | --------------------------------------------- | ---------------------------- |
| `tracesSampleRate` | 1.0 (100%)                                    | 0.2 (20%)                    |
| `enabled`          | Only if `SENTRY_DSN` is set                   | Only if `SENTRY_DSN` is set  |
| `environment`      | `SENTRY_ENVIRONMENT` env var or `development` | `SENTRY_ENVIRONMENT` env var |

**Required environment variables:**

```bash
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ENVIRONMENT=production
```

**What Sentry captures:**

- Unhandled exceptions (via `AllExceptionsFilter`)
- Request context (method, URL, user agent, IP, correlation ID)
- User identity (ID and email when authenticated)
- Error breadcrumbs from the logging interceptor

---

## Monitoring Stack

The monitoring infrastructure is defined in `backend/monitoring/` and orchestrated via Docker Compose.

### Prometheus

**Config:** `backend/monitoring/prometheus/prometheus.yml`

- **Scrape interval:** 15 seconds
- **Evaluation interval:** 15 seconds
- **Target:** `host.docker.internal:3000/metrics`
- **Job name:** `chioma-backend`

Prometheus scrapes the `/metrics` endpoint exposed by the backend, which provides application-level metrics via the `prom-client` library.

### Grafana

**Config:** `backend/monitoring/grafana/provisioning/datasources/`

Grafana is pre-configured with Prometheus and Loki as data sources. Access the dashboard UI to visualize:

- Request rates and latencies
- Error rates by endpoint
- Blockchain transaction metrics
- Database connection pool usage

### Loki (Log Aggregation)

**Config:** `backend/monitoring/loki/loki-config.yml`

Loki stores and indexes log streams shipped by Promtail:

- **Listen port:** 3100
- **Storage:** Local filesystem (BoltDB index + filesystem chunks)
- **Retention:** Old samples rejected after 168 hours (7 days)
- **Schema:** v11

### Promtail (Log Shipping)

**Config:** `backend/monitoring/promtail/promtail-config.yml`

Promtail tails application log files and pushes them to Loki:

- **Source:** `/app/logs/*.log`
- **Destination:** `http://loki:3100/loki/api/v1/push`
- **Job label:** `chioma-backend`

### Alertmanager

**Config:** `backend/monitoring/alertmanager/alertmanager.yml`

Alertmanager routes alerts from Prometheus to notification channels:

- **Grouping:** By `alertname` and `severity`
- **Group wait:** 10 seconds
- **Repeat interval:** 12 hours
- **Routing:**
  - `critical` severity → `critical` receiver
  - `warning` severity → `warning` receiver
  - Default → `default` receiver
- **All receivers** post to: `http://host.docker.internal:3000/api/alerts/webhook`
- **Inhibition:** Critical alerts suppress warnings for the same `alertname`

---

## Alerts

**Config:** `backend/monitoring/prometheus/alerts.yml`

The following alert rules are configured:

| Alert                           | Condition                                           | Duration | Severity |
| ------------------------------- | --------------------------------------------------- | -------- | -------- |
| HighErrorRate                   | 5xx error rate > 0.05/sec over 5 minutes            | 5m       | critical |
| HighResponseTime                | P95 response time > 1 second over 5 minutes         | 5m       | warning  |
| BlockchainTransactionFailure    | Blockchain tx failure rate > 0.1/sec over 5 minutes | 2m       | critical |
| DatabaseConnectionPoolExhausted | Active connections > 90% of max pool over 5 minutes | 5m       | warning  |

### Adding Custom Alerts

Add new rules to `backend/monitoring/prometheus/alerts.yml`:

```yaml
- alert: HighPaymentFailureRate
  expr: rate(payment_failures_total[5m]) > 0.02
  for: 3m
  labels:
    severity: critical
  annotations:
    summary: 'High payment failure rate'
    description: '{{ $value }} payment failures per second'
```

---

## Health Checks

The backend exposes health check endpoints excluded from the API prefix:

| Endpoint               | Description                            |
| ---------------------- | -------------------------------------- |
| `GET /health`          | Basic liveness check                   |
| `GET /health/detailed` | Detailed status with dependency health |

Health endpoints are excluded from logging middleware and the logging interceptor to avoid noise.

---

## Running the Monitoring Stack

Start the full monitoring stack with Docker Compose:

```bash
# From the backend directory
docker-compose -f docker-compose.monitoring.yml up -d
```

**Service ports:**

| Service      | Port | URL                   |
| ------------ | ---- | --------------------- |
| Prometheus   | 9090 | http://localhost:9090 |
| Grafana      | 3001 | http://localhost:3001 |
| Loki         | 3100 | http://localhost:3100 |
| Alertmanager | 9093 | http://localhost:9093 |
| Promtail     | 9080 | http://localhost:9080 |

---

## Best Practices

### Logging

1. **Always include context** — Use the `LogContext` fields (`service`, `method`, `userId`, `requestId`) for every log call
2. **Never log sensitive data** — The sanitization layer handles headers and known fields, but avoid logging raw tokens, passwords, or PII in custom log calls
3. **Use appropriate log levels** — Reserve ERROR for actual failures, not expected conditions like 404s
4. **Include correlation IDs** — Pass `X-Request-ID` from clients through all service calls for distributed tracing
5. **Log at boundaries** — Log at service entry/exit points, external API calls, and state transitions

### Monitoring

1. **Set meaningful alert thresholds** — Base thresholds on observed baselines, not guesses
2. **Avoid alert fatigue** — Only alert on actionable conditions; use dashboards for informational metrics
3. **Monitor business metrics** — Track payment success rates, agreement creation, and blockchain transaction throughput alongside infrastructure metrics
4. **Review dashboards regularly** — Keep Grafana dashboards updated as new features ship
5. **Test alerts** — Periodically verify that alert routing and notification channels work end-to-end

### Environment Variables

| Variable                     | Description                         | Default       |
| ---------------------------- | ----------------------------------- | ------------- |
| `SENTRY_DSN`                 | Sentry Data Source Name             | _(disabled)_  |
| `SENTRY_ENVIRONMENT`         | Sentry environment tag              | `development` |
| `NODE_ENV`                   | Controls log output destination     | `development` |
| `LOG_SLOW_REQUEST_THRESHOLD` | Slow request warning threshold (ms) | `500`         |
