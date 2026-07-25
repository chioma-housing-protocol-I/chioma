# Performance Tuning Guidelines

Operational guide for tuning the Chioma NestJS backend in development, staging, and production. Use this document when optimizing latency, throughput, or resource usage before and after deployments.

**Related documentation:**

- [Scalability & Performance](./architecture/scalability-and-performance.md) — scaling strategy and capacity planning
- [Database Performance Indexes](./database/PERFORMANCE_INDEXES.md) — index reference and query patterns
- [Caching Strategy](./caching/CACHING_STRATEGY.md) — Redis tiers, keys, TTLs
- [Monitoring & Alerting](./deployment/MONITORING_AND_ALERTING.md) — metrics and alerts
- [Logging & Monitoring](./LOGGING_AND_MONITORING.md) — structured logs and observability

---

## 1. Performance targets (SLAs)

| Metric                       | Target                 | How to measure                                  |
| ---------------------------- | ---------------------- | ----------------------------------------------- |
| API latency (P95)            | < 200 ms               | Prometheus `http_request_duration_seconds`, APM |
| API latency (P99)            | < 500 ms               | Same; investigate outliers above 1 s            |
| Database query (P95)         | < 50 ms                | Slow-query logs, `LOG_SLOW_REQUEST_THRESHOLD`   |
| Background job latency       | < 2 s (critical paths) | Bull queue metrics, `/api/v1/queues` admin      |
| Error rate (5xx)             | < 0.1%                 | Prometheus `http_requests_total{status=~"5.."}` |
| Cache hit ratio (read-heavy) | > 80%                  | Redis/cache stats, custom metrics               |

Run the local benchmark script before releases:

```bash
cd backend
pnpm run start:dev   # in another terminal
pnpm run perf        # autocannon against /health, /api/docs-json, etc.
```

---

## 2. Node.js and NestJS tuning

### Production runtime

| Setting              | Recommendation                     | Notes                                                   |
| -------------------- | ---------------------------------- | ------------------------------------------------------- |
| `NODE_ENV`           | `production`                       | Enables optimized builds, disables verbose errors       |
| Process memory       | 512 MB–1 GB per API pod (baseline) | Scale with heap monitoring; OOM → increase or fix leaks |
| `UV_THREADPOOL_SIZE` | `16` (if heavy crypto/fs)          | Only when profiling shows thread-pool starvation        |
| Clustering           | Multiple pods behind LB            | Prefer horizontal scale over single large Node process  |

### Application configuration

| Variable                     | Purpose                         | Tuning guidance                                          |
| ---------------------------- | ------------------------------- | -------------------------------------------------------- |
| `LOG_SLOW_REQUEST_THRESHOLD` | Log requests slower than N ms   | Start at `500`; lower to `300` when optimizing hot paths |
| `LOG_SKIP_PATHS`             | Exclude noisy paths from timing | Keep `/health`, `/metrics` excluded                      |
| `REQUEST_SIZE_LIMIT_JSON`    | Max JSON body size              | Default `1mb`; increase only for upload endpoints        |
| `METRICS_ENABLED`            | Prometheus metrics              | Keep `true` in staging/production                        |

### Code-level practices

1. **Avoid blocking the event loop** — offload CPU-heavy work (image processing, PDF generation) to Bull queues.
2. **Use pagination** — never return unbounded lists; follow [Pagination standards](./api/PAGINATION.md).
3. **Prevent N+1 queries** — use `relations`, QueryBuilder joins, or DataLoader patterns in TypeORM.
4. **Stream large responses** — prefer chunked/streaming for exports when implemented.
5. **Validate early** — global `ValidationPipe` rejects bad input before hitting services.

---

## 3. Database tuning (PostgreSQL)

### Connection pooling

- Use TypeORM pooling via environment (`DB_*` settings in `.env.example`).
- **Rule of thumb:** `pool max ≈ (num_api_pods × expected_concurrent_queries_per_pod)`, capped below PostgreSQL `max_connections`.
- Monitor active connections: `GET /health/detailed` and database metrics.
- Long transactions block pool slots — keep service methods short; avoid holding transactions open across HTTP calls.

### Query optimization

1. Run `EXPLAIN ANALYZE` on slow queries logged above threshold.
2. Ensure indexes exist — see [PERFORMANCE_INDEXES.md](./database/PERFORMANCE_INDEXES.md).
3. Select only required columns; avoid `SELECT *` on wide tables.
4. Use partial indexes for soft-deleted or status-filtered rows where documented.
5. Batch writes where possible; use migrations for schema changes, not runtime DDL.

### Read replicas (production)

- Route read-heavy, eventually-consistent endpoints to replicas when configured.
- Never route payment or escrow writes to replicas.

### Database Performance Analysis

We have built-in tools to monitor and analyze database performance:

1.  **API Endpoints (Admin/Super Admin only):**
    - `GET /database-performance/report`: Returns a comprehensive report including index usage, sizes, and slow queries.
    - `GET /database-performance/slow-queries`: Returns statistics from `pg_stat_statements`.
    - `GET /database-performance/indexes/usage`: Returns index scan statistics.

2.  **CLI Report Script:**
    You can run a local performance report against the database using:
    ```bash
    pnpm run db:perf-report
    ```
    This script provides a terminal-friendly output of slow queries, unused indexes, largest tables, and cache hit ratios. Note: `pg_stat_statements` must be enabled (via migration `1900000000000` and `shared_preload_libraries=pg_stat_statements` in the database configuration, which is configured in `docker-compose.yml`) for slow query analysis to work.

---

## 4. Redis and caching

See [CACHING_STRATEGY.md](./caching/CACHING_STRATEGY.md) for architecture.

| Variable                    | Tuning guidance                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `REDIS_URL` / `REDIS_TOKEN` | Upstash for serverless; ensure region matches API                                     |
| `REDIS_HOST` / `REDIS_PORT` | Dedicated Redis for staging/production under load                                     |
| TTL policies                | Shorter TTL for frequently changing data (listings); longer for static reference data |

**Tuning checklist:**

- [ ] Cache keys use documented namespaces (`property:`, `search:`, etc.)
- [ ] Invalidate on writes (property update → clear listing cache)
- [ ] Monitor memory usage; set `maxmemory-policy` to `allkeys-lru` on dedicated Redis
- [ ] Avoid caching user-specific secrets or PII blobs

---

## 5. Background jobs (Bull queues)

Queues: `email`, `documents`, `blockchain`, `data-sync`.

| Variable                         | Default (example) | Tuning                                          |
| -------------------------------- | ----------------- | ----------------------------------------------- |
| `BULL_QUEUE_EMAIL_ATTEMPTS`      | `3`               | Increase only for transient SMTP failures       |
| `BULL_QUEUE_BLOCKCHAIN_ATTEMPTS` | `5`               | Stellar/network flakiness; monitor failed count |
| `BULL_QUEUE_*_BACKOFF_DELAY`     | `2000–5000` ms    | Exponential backoff is configured in code       |

**Operations:**

- Monitor via `GET /api/v1/queues/stats` (admin JWT).
- Scale **workers** independently of API pods when queue depth grows.
- Pause queues during maintenance: `POST /api/v1/queues/:name/pause`.

---

## 6. Rate limiting

Protects auth and expensive endpoints. See [RATE-LIMITING.md](./api/RATE-LIMITING.md).

| Variable                | Purpose                         |
| ----------------------- | ------------------------------- |
| `RATE_LIMIT_MAX`        | General API requests per window |
| `RATE_LIMIT_AUTH_MAX`   | Stricter limit for `/auth/*`    |
| `RATE_LIMIT_STRICT_MAX` | High-cost endpoints             |

Increase limits only after load testing proves capacity; prefer CDN/edge caching for public reads instead of raising global limits.

---

## 7. Stellar and external APIs

| Area                  | Guidance                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| Horizon / Soroban RPC | Set `STELLAR_HORIZON_URL`, `SOROBAN_RPC_URL` to nearest region                    |
| Timeouts              | `HEALTH_CHECK_TIMEOUT`, `PAYMENT_GATEWAY_TIMEOUT_MS` — fail fast, retry via queue |
| Circuit breaking      | Use existing retry decorators; do not block HTTP threads on chain calls           |

---

## 8. Observability-driven tuning workflow

```text
1. Establish baseline  →  pnpm run perf + Grafana dashboards
2. Identify bottleneck →  APM trace / slow logs / queue depth
3. Apply one change     →  index, cache TTL, pool size, or scale
4. Re-measure           →  compare P95/P99 and error rate
5. Document change      →  PR notes or runbook update
```

**Prometheus metrics to watch:**

- `http_request_duration_seconds` (histogram)
- `http_requests_total` by status
- `db_query_duration_seconds`
- `queue_jobs_waiting`, `queue_jobs_failed`
- `redis_command_duration_seconds`

**Alerts:** configure per [MONITORING_AND_ALERTING.md](./deployment/MONITORING_AND_ALERTING.md) (`HighErrorRate`, `HighResponseTime`, `DatabaseConnectionPoolExhausted`).

---

## 9. Environment-specific recommendations

### Local development

- Use in-memory or local Redis; caching may be disabled implicitly.
- `DB_TYPE=sqlite` for fast tests; use PostgreSQL for E2E parity.
- Do not tune for production SLAs locally; focus on correctness.

### Staging

- Mirror production instance sizes at ~50–70% scale.
- Run load tests (`k6`, `Artillery`) against critical flows before release.
- Enable full metrics and slow-request logging.

### Production

- Run at least 2 API replicas behind a load balancer.
- Enable Redis, structured logging, Sentry, and Prometheus scraping.
- Review [DEPLOYMENT_CHECKLIST.md](./deployment/DEPLOYMENT_CHECKLIST.md) before each release.

---

## 10. Pre-release performance checklist

- [ ] `make ci` passes locally
- [ ] `pnpm run perf` meets thresholds (server running)
- [ ] No new N+1 queries in PR (review TypeORM usage)
- [ ] Migrations include indexes for new filter/sort columns
- [ ] Cache invalidation updated for new write paths
- [ ] Bull jobs use queues for work > 100 ms
- [ ] Load test on staging for critical user journeys
- [ ] Grafana dashboards show no regression in P95 latency

---

## 11. Troubleshooting quick reference

| Symptom                   | Likely cause                    | Action                                               |
| ------------------------- | ------------------------------- | ---------------------------------------------------- |
| High P95 latency, low CPU | Database or Redis wait          | Check slow queries, connection pool, cache miss rate |
| High CPU, normal latency  | JSON serialization / validation | Profile hot endpoints; add caching                   |
| Memory climbing over days | Event listener leak             | Heap snapshot; restart pods; fix leak                |
| 503 under load            | Pool exhaustion or LB timeout   | Increase pool carefully; scale replicas              |
| Queue backlog             | Insufficient workers            | Scale workers; check failed jobs                     |
| Spiky auth latency        | Rate limit or bcrypt cost       | Expected; ensure bcrypt rounds = 12                  |

---

## 12. Further reading

| Document                                                                   | Topic                            |
| -------------------------------------------------------------------------- | -------------------------------- |
| [Scalability & Performance](./architecture/scalability-and-performance.md) | Horizontal scaling, load testing |
| [PERFORMANCE_INDEXES.md](./database/PERFORMANCE_INDEXES.md)                | Index catalog                    |
| [CACHING_STRATEGY.md](./caching/CACHING_STRATEGY.md)                       | Cache layers                     |
| [QUEUE_TROUBLESHOOTING.md](./queues/QUEUE_TROUBLESHOOTING.md)              | Bull queue issues                |
| [COMPREHENSIVE_MONITORING.md](./COMPREHENSIVE_MONITORING.md)               | Full observability stack         |
