# Application Performance Monitoring (APM)

The backend reports to Datadog or New Relic through vendor-neutral OpenTelemetry (traces) and Prometheus (metrics). No vendor agent library runs inside the Node process; switching vendors is a configuration change.

## What is tracked

| Signal | Source | Metric / span |
| --- | --- | --- |
| Request duration | `MetricsMiddleware` + HTTP/Express auto-instrumentation | `http_request_duration_ms` histogram (`route`, `method`, `status_class`); HTTP server spans |
| Request throughput | `MetricsMiddleware` | `http_requests_total` |
| DB query times | `DatabasePerformanceTrack` / `DatabaseMonitorService` + pg/TypeORM auto-instrumentation | `db_query_duration_ms` histogram (`query_type`), `database_query_avg_time_ms`, `database_pool_*`; `pg.query` spans |
| Cache hit rate | `CacheService.get` → `MetricsService.recordCacheOperation` | `cache_operations_total{result="hit"\|"miss"}`, `cache_hit_ratio`; Postgres buffer cache: `database_cache_hit_ratio` |
| Errors | `MetricsMiddleware`, `AllExceptionsFilter` | `http_errors_total` (4xx/5xx); 5xx exceptions are recorded on the active span with `ERROR` status (and still sent to Sentry) |

Slow requests (> 2 s), slow queries (> 1 s) and 5xx responses also raise persisted performance alerts (`PERFORMANCE_THRESHOLDS` in `metrics.service.ts`).

## Configuration

Set in the backend environment (see `backend/.env.example`):

| Variable | Purpose |
| --- | --- |
| `OTEL_ENABLED` | `false` disables tracing entirely |
| `APM_PROVIDER` | `otlp` (default, Jaeger/collector), `datadog` or `newrelic` |
| `OTEL_SERVICE_NAME` | Service name on traces (default `chioma-backend`) |
| `APP_VERSION` | Service version tag (use the image tag / git SHA) |
| `DD_AGENT_HOST`, `DD_OTLP_HTTP_PORT`, `DD_ENV` | Datadog Agent OTLP intake location and environment tag |
| `NEW_RELIC_LICENSE_KEY`, `NEW_RELIC_REGION` | New Relic ingest key (`api-key` header) and `us`/`eu` endpoint |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Explicit endpoint; overrides the provider default |

## Datadog

1. Run the Datadog Agent next to the backend. Locally: `cd backend && DD_API_KEY=<key> docker compose -f docker-compose.monitoring.yml --profile datadog up -d datadog-agent`. In Kubernetes, use the Datadog Helm chart with OTLP HTTP intake enabled on port 4318.
2. Set `APM_PROVIDER=datadog` and `DD_AGENT_HOST` to the agent host (in Kubernetes, the node IP via `status.hostIP`).
3. Metrics are collected by the agent's OpenMetrics check (`backend/monitoring/datadog/conf.d/openmetrics.d/conf.yaml`) and appear under the `chioma.` namespace.

## New Relic

1. Set `APM_PROVIDER=newrelic`, `NEW_RELIC_LICENSE_KEY` (from a secret, never committed) and `NEW_RELIC_REGION`.
2. Traces go directly to New Relic's OTLP endpoint and show up under APM & Services → OpenTelemetry.
3. For metrics, add the `remote_write` block from `backend/monitoring/newrelic/prometheus-remote-write.yml` to the Prometheus config.

## Suggested monitors

| Monitor | Query (Prometheus naming) | Threshold |
| --- | --- | --- |
| p95 latency | `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_ms_bucket[5m])))` | > 2000 ms for 5 min |
| Error rate | `sum(rate(http_errors_total{status_class="5xx"}[5m])) / sum(rate(http_requests_total[5m]))` | > 1% for 5 min |
| p95 DB query | `histogram_quantile(0.95, sum by (le) (rate(db_query_duration_ms_bucket[5m])))` | > 500 ms for 10 min |
| Cache hit rate | `cache_hit_ratio` | < 0.7 for 15 min |
