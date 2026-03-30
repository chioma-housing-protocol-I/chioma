# Queue Deployment Checklist

Use this checklist before deploying, after deploying, and when assessing production readiness of the Bull message queue system. Each item has a clear pass/fail criterion.

---

## Pre-Deployment Checklist

Complete all items before starting the application in a new environment.

### Redis Connectivity

- [ ] **Redis host is reachable from the application host**
  - Pass: `redis-cli -h $REDIS_HOST -p $REDIS_PORT ping` returns `PONG`
  - Fail: Connection refused, timeout, or authentication error

- [ ] **Redis authentication credentials are correct**
  - Pass: `redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping` returns `PONG` without error
  - Fail: `WRONGPASS invalid username-password pair` or `NOAUTH Authentication required`

- [ ] **TLS setting matches the Redis server configuration**
  - Pass: `REDIS_TLS=true` when the server requires TLS; `REDIS_TLS=false` (or unset) when it does not
  - Fail: Connection fails with `SSL routines` or `certificate verify failed` errors

### Environment Variables

- [ ] **All required Redis environment variables are set**
  - For traditional Redis: `REDIS_HOST`, `REDIS_PORT` are set (password/username if required)
  - For Upstash: `REDIS_URL` and `REDIS_TOKEN` are both set
  - Pass: `echo $REDIS_HOST` (or `$REDIS_URL`) returns a non-empty value
  - Fail: Variable is empty or unset

- [ ] **No conflicting Redis configuration** (Upstash and traditional Redis vars are not both set)
  - Pass: Either `REDIS_URL`+`REDIS_TOKEN` are set, OR `REDIS_HOST`+`REDIS_PORT` are set — not both
  - Fail: Both sets of variables are populated, causing ambiguous configuration

- [ ] **Optional Bull queue tuning variables are valid if set**
  - Pass: `BULL_QUEUE_*_ATTEMPTS` values are positive integers; `BULL_QUEUE_*_BACKOFF_DELAY` values are positive integers (milliseconds)
  - Fail: Non-numeric or zero/negative values

### Module Registration

- [ ] **`QueuesModule` is imported in `AppModule`**
  - Pass: `QueuesModule` appears in `AppModule.imports` and `OPENAPI_GENERATE` is not set to `true`
  - Fail: `QueuesModule` is absent from imports, or `OPENAPI_GENERATE=true` is set in the runtime environment

- [ ] **All four queues are registered: `email`, `documents`, `blockchain`, `data-sync`**
  - Pass: `BullModule.registerQueue` in `QueuesModule` includes all four queue names
  - Fail: Any queue name is missing from the registration list

- [ ] **All four processor classes are listed in `QueuesModule.providers`**
  - Pass: `EmailQueueProcessor`, `DocumentQueueProcessor`, `BlockchainQueueProcessor`, `DataSyncQueueProcessor` are all present
  - Fail: Any processor class is missing

---

## Post-Deployment Checklist

Complete all items after the application has started successfully.

### Queue Health

- [ ] **All four queues report healthy status**
  - Pass: `GET /api/v1/queues/health` returns `"healthy": true` and `"unhealthyQueues": []`
  - Fail: Any queue shows `"paused": true` or `"failed" > 20`, or the endpoint returns an error

- [ ] **No queues are paused**
  - Pass: All four queues (`email`, `documents`, `blockchain`, `data-sync`) show `"paused": false`
  - Fail: Any queue shows `"paused": true`

- [ ] **`email` queue is accepting and processing jobs**
  - Pass: Enqueue a test email job and confirm it moves from `waiting` → `active` → `completed`
  - Fail: Job remains in `waiting` indefinitely or moves to `failed`

- [ ] **`documents` queue is accepting and processing jobs**
  - Pass: Enqueue a test document job and confirm it moves from `waiting` → `active` → `completed`
  - Fail: Job remains in `waiting` indefinitely or moves to `failed`

- [ ] **`blockchain` queue is accepting and processing jobs**
  - Pass: Enqueue a test blockchain job and confirm it moves from `waiting` → `active` → `completed`
  - Fail: Job remains in `waiting` indefinitely or moves to `failed`

- [ ] **`data-sync` queue is accepting and processing jobs**
  - Pass: Enqueue a test data-sync job and confirm it moves from `waiting` → `active` → `completed`
  - Fail: Job remains in `waiting` indefinitely or moves to `failed`

### Metrics Collection

- [ ] **Metrics collection is running**
  - Pass: `GET /api/v1/queues/email/metrics` returns at least one entry after 60 seconds of uptime
  - Fail: Endpoint returns an empty array after more than 60 seconds of uptime

- [ ] **Dashboard stats endpoint is responding**
  - Pass: `GET /api/v1/queues/dashboard/stats` returns a valid JSON object with `currentStats` and `metricsHistory` keys
  - Fail: Endpoint returns an error or missing keys

### Failed Job Baseline

- [ ] **Failed job count is zero (or at an acceptable baseline) at deployment time**
  - Pass: `GET /api/v1/queues/stats` shows `"failed": 0` for all four queues
  - Fail: Non-zero `failed` counts at deployment time indicate pre-existing issues that must be investigated before going live

---

## Production Readiness Checklist

Complete all items before accepting production traffic.

### Redis Persistence

- [ ] **Redis persistence is enabled (RDB or AOF)**
  - Pass: `redis-cli config get save` returns non-empty save intervals (RDB), OR `redis-cli config get appendonly` returns `yes` (AOF)
  - Fail: Both RDB and AOF are disabled (`save ""` and `appendonly no`)

- [ ] **AOF persistence is enabled for the `blockchain` queue's Redis instance**
  - Pass: `redis-cli config get appendonly` returns `yes`; `redis-cli config get appendfsync` returns `everysec` or `always`
  - Fail: AOF is disabled, risking loss of blockchain job data on crash

- [ ] **Redis `maxmemory-policy` is set to `noeviction`**
  - Pass: `redis-cli config get maxmemory-policy` returns `noeviction`
  - Fail: Any other policy (e.g., `allkeys-lru`) risks silent job data eviction under memory pressure

### TLS and Authentication

- [ ] **TLS is enabled for Redis connections in production**
  - Pass: `REDIS_TLS=true` is set (traditional Redis), OR Upstash REST API is used (TLS built-in)
  - Fail: `REDIS_TLS=false` or unset in a production environment with a managed Redis service

- [ ] **Redis is password-protected**
  - Pass: `REDIS_PASSWORD` is set to a strong, unique password; `requirepass` is configured in `redis.conf`
  - Fail: Redis is accessible without authentication

- [ ] **Admin API endpoints require authentication**
  - Pass: `GET /api/v1/queues/health` without a token returns `401 Unauthorized`
  - Fail: Endpoint returns data without a token

- [ ] **Admin API endpoints require admin role**
  - Pass: `GET /api/v1/queues/health` with a non-admin JWT returns `403 Forbidden`
  - Fail: Endpoint returns data for non-admin users

### Backups

- [ ] **Automated Redis backups are configured**
  - Pass: RDB snapshots or AOF files are copied to object storage on a schedule (at minimum daily); OR managed Redis backup feature is enabled with ≥ 7-day retention
  - Fail: No backup mechanism is in place

- [ ] **Backup restore procedure has been tested**
  - Pass: A restore from backup has been successfully completed in a staging environment within the last 30 days
  - Fail: Restore procedure has never been tested or last test was more than 30 days ago

### Monitoring Alerts

- [ ] **Alert is configured for queue health failures**
  - Pass: An alert fires when `GET /api/v1/queues/health` returns `"healthy": false` for more than 5 minutes
  - Fail: No alert is configured for queue health

- [ ] **Alert is configured for high failed job counts**
  - Pass: An alert fires when `failed` count exceeds 10 for any of the four queues (`email`, `documents`, `blockchain`, `data-sync`)
  - Fail: No alert is configured for failed job accumulation

- [ ] **Alert is configured for Redis memory usage**
  - Pass: An alert fires when Redis memory usage exceeds 80% of `maxmemory`
  - Fail: No alert is configured for Redis memory

- [ ] **Alert is configured for high `waiting` job counts**
  - Pass: An alert fires when `waiting` count exceeds 500 for any queue for more than 5 minutes
  - Fail: No alert is configured for queue backlog
