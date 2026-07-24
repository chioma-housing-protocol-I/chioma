# API Response Time Tracking

## Decision

**In-memory ring buffer with Prometheus Histogram + structured log emission.**

Each route keeps a capped ring buffer of the last `RESPONSE_TIME_BUFFER_SIZE`
(default 1000) raw observations in `PerformanceMonitorService`. This feeds:

1. **Prometheus** — `http_request_duration_ms` Histogram (buckets 5–5000 ms)
   and `http_requests_total` Counter, both labelled `route / method / status_class`.
   Scraped by the existing Prometheus sidecar (`backend/monitoring/prometheus/`).

2. **Structured log** — one JSON line per request at INFO level with fields
   `event`, `route`, `method`, `status`, `duration_ms`, `slow`.
   Shipped to Loki via Promtail (`backend/monitoring/promtail/`).

3. **In-process analysis** — `GET /api/performance/response-times` returns a
   p50/p95/p99 snapshot over a configurable sliding window for dashboards and
   alerting without requiring an external query.

A database table was rejected: per-request rows at production traffic would
require a separate time-series store and add write latency to every request.
A Summary was rejected: client-side quantiles are not aggregatable across
multiple backend instances.

## Middleware Placement

`ResponseTimeInterceptor` is registered as a global `APP_INTERCEPTOR` in
`AppModule`. NestJS interceptors wrap the entire handler including guards,
pipes, and all inner middleware, measuring true wall-clock latency. It runs
after `LoggingInterceptor` and `RateLimitInterceptor` (registered in
`main.ts`) but those add negligible overhead.

The existing `PerformanceMiddleware` (Express-level, patches `res.end`) is
retained for Prometheus counter calls but its duplicate slow-request warn was
removed — the interceptor owns that responsibility.

## Dimensions

| Dimension    | Notes                                                |
| ------------ | ---------------------------------------------------- |
| route        | Router template, e.g. `GET /api/properties/:id`      |
| method       | HTTP verb                                            |
| status_class | `2xx` / `4xx` / `5xx` (grouped to limit cardinality) |

## Slow Request Threshold

Requests exceeding `RESPONSE_TIME_SLOW_THRESHOLD_MS` (default 500 ms, falls
back to `LOG_SLOW_REQUEST_THRESHOLD` for backwards compatibility) emit a
structured WARN log. Use this to detect regressions in CI log output.

The constant `SLOW_REQUEST_THRESHOLD_MS` is exported from
`src/modules/monitoring/performance-monitor.service.ts` and is the single
source of truth for both the WARN log and the `slow` field in the INFO log.

## Analysis

### Internal endpoint (admin only)

```bash
curl -H "Authorization: Bearer <admin-jwt>" \
  http://localhost:5000/api/performance/response-times?window=60
```

Response shape:

```json
{
  "generated_at": "2026-05-28T09:00:00Z",
  "window_seconds": 60,
  "routes": [
    {
      "route": "GET /api/properties/:id",
      "count": 142,
      "rps": 2.37,
      "p50_ms": 45,
      "p95_ms": 312,
      "p99_ms": 891,
      "slow_count": 3
    }
  ]
}
```

Routes are sorted by p99 descending (worst performers first).

### Prometheus (histogram_quantile)

```promql
# p95 latency per route over the last 5 minutes
histogram_quantile(0.95,
  sum by (route, le) (
    rate(http_request_duration_ms_bucket[5m])
  )
)

# Request rate by status class
sum by (route, status_class) (
  rate(http_requests_total[1m])
)
```

### Log aggregator

See [`docs/api-response-time-log-queries.md`](./api-response-time-log-queries.md)
for LogQL, Elasticsearch, and CloudWatch Insights query patterns.

## Cardinality Note

Route patterns **must** be extracted from the router template (`req.route?.path`),
not the raw URL. Using raw paths with user IDs (e.g. `/api/properties/42`) would
create one metric series per resource ID — an unbounded cardinality explosion
that degrades Prometheus, Loki, and the in-memory ring buffer alike.

The interceptor uses `req.route?.path ?? req.path` so parameterised routes like
`/api/properties/:id` are always grouped correctly regardless of the actual ID.

## Configuration

| Variable                          | Default | Description                          |
| --------------------------------- | ------- | ------------------------------------ |
| `RESPONSE_TIME_ENABLED`           | `true`  | Kill switch — set `false` to disable |
| `RESPONSE_TIME_SLOW_THRESHOLD_MS` | `500`   | Warn threshold in ms                 |
| `RESPONSE_TIME_WINDOW_SECONDS`    | `60`    | Sliding window for analysis endpoint |
| `RESPONSE_TIME_BUFFER_SIZE`       | `1000`  | Max observations stored per route    |

## Running Locally

```bash
make test       # unit tests
make test-cov   # with coverage
make ci         # full CI: format + lint + typecheck + test-cov + build
make security-ci # security lint + smoke tests
```
