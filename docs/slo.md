# Service Level Objectives

Targets for the critical user journeys. Measured from `http_requests_total` and `http_request_duration_ms` (labels `route`, `method`, `status_class`) exported by `MetricsService`; see [performance-monitoring.md](performance-monitoring.md) and [response-time-tracking.md](response-time-tracking.md).

Window: rolling 30 days.

| Journey            | Routes (regex)                                             | Availability SLO | Latency SLO   | Error budget (30d) |
| ------------------ | ---------------------------------------------------------- | ---------------- | ------------- | ------------------ |
| Platform (all API) | `.*`                                                       | 99.5% non-5xx    | 95% < 1000 ms | 3h 36m             |
| Search             | `/api/(v\d+/)?(search\|properties).*`                      | 99.9%            | 95% < 500 ms  | 43m                |
| Booking            | `/api/(v\d+/)?(agreements\|rent\|sublet).*`                | 99.9%            | 95% < 1000 ms | 43m                |
| Payment            | `/api/(v\d+/)?(payments\|escrow\|stellar\|transactions).*` | 99.95%           | 95% < 2500 ms | 22m                |

Availability SLI = requests with `status_class!="5xx"` / all requests. Latency SLI = requests under the threshold bucket / all requests.

## Burn-rate alerting

Multi-window, multi-burn-rate (Google SRE workbook). Rules: `backend/monitoring/prometheus/slo-rules.yml`.

| Severity         | Burn rate | Long / short window | Budget consumed |
| ---------------- | --------- | ------------------- | --------------- |
| critical (page)  | 14.4×     | 1h / 5m             | 2% in 1h        |
| critical (page)  | 6×        | 6h / 30m            | 5% in 6h        |
| warning (ticket) | 1×        | 3d / 6h             | 10% in 3d       |

## Error budget policy

- Budget remaining > 0: ship normally.
- Budget exhausted: freeze non-reliability releases for that journey until the 30-day window recovers; postmortem required.
- SLOs are reviewed quarterly by backend owners.
