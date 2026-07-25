# API Response Time — Log Query Patterns

Every HTTP request emits one structured log line at INFO level from
`ResponseTimeInterceptor`. Slow requests (> 1000 ms) additionally emit a WARN
line. Both lines are shipped to Loki via Promtail.

## Log shape

```json
{
  "level": "log",
  "context": "ResponseTimeInterceptor",
  "event": "http_request",
  "route": "/api/properties/:id",
  "method": "GET",
  "status": 200,
  "duration_ms": 143,
  "slow": false
}
```

The `slow` field is `true` when `duration_ms > 1000` (see `SLOW_REQUEST_THRESHOLD_MS`).

---

## Loki (LogQL)

### All slow requests in the last hour

```logql
{app="chioma-backend"} | json | event="http_request" | slow=`true`
```

### p95 latency per route (last 5 min)

```logql
quantile_over_time(0.95,
  {app="chioma-backend"}
  | json
  | event="http_request"
  | unwrap duration_ms [5m]
) by (route)
```

### Request rate by status class (per minute)

```logql
sum by (route, method) (
  rate(
    {app="chioma-backend"}
    | json
    | event="http_request"
    | status >= 500 [1m]
  )
)
```

### Top 10 slowest routes by average duration

```logql
topk(10,
  avg_over_time(
    {app="chioma-backend"}
    | json
    | event="http_request"
    | unwrap duration_ms [1h]
  ) by (route)
)
```

---

## Elasticsearch / OpenSearch (Lucene)

### Slow requests

```
event:"http_request" AND slow:true
```

### Slow requests on a specific route

```
event:"http_request" AND route:"/api/payments" AND slow:true
```

### Aggregation — avg duration per route (Kibana Lens / TSVB)

- Field: `duration_ms`
- Split by: `route.keyword`
- Metric: Average

---

## CloudWatch Insights

### Slow requests

```sql
fields @timestamp, route, method, status, duration_ms
| filter event = "http_request" and slow = 1
| sort duration_ms desc
| limit 50
```

### p95 latency per route (last 1 hour)

```sql
fields route, duration_ms
| filter event = "http_request"
| stats pct(duration_ms, 95) as p95 by route
| sort p95 desc
```

### Error rate by route

```sql
fields route, status
| filter event = "http_request" and status >= 400
| stats count() as errors by route
| sort errors desc
```

---

## Threshold

The slow-request threshold is defined as `SLOW_REQUEST_THRESHOLD_MS = 1000` in
`backend/src/modules/monitoring/performance-monitor.service.ts`.
Change it there to adjust both the WARN log and the `slow` field.
