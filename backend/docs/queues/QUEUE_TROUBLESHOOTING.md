# Queue Troubleshooting Guide

This guide covers the five most common failure scenarios for the Bull message queue system. Each scenario follows the same structure: **Symptoms → Diagnostic Steps → Resolution**.

---

## 1. Queue Not Processing Jobs

### Symptoms

- Jobs accumulate in the `waiting` state but are never picked up.
- The `active` count stays at `0` even though `waiting` is non-zero.
- No processor log lines appear for the affected queue.

### Diagnostic Steps

**Step 1 — Check if the queue is paused.**

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/health
```

Look for `"paused": true` on the affected queue. A paused queue will not pick up new jobs.

**Step 2 — Check that the worker process is running.**

```bash
# List running Node processes
ps aux | grep node
```

If no worker process is running, jobs will accumulate indefinitely.

**Step 3 — Check Redis connectivity from the worker.**

```bash
# From the worker host, test Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
# Expected: PONG
```

**Step 4 — Check application logs for processor registration errors.**

```bash
# Look for Bull processor registration log lines on startup
grep -i "processor\|queue\|bull" /var/log/app.log | head -50
```

A missing `Registered processor for queue 'email'` line indicates the processor was not registered.

**Step 5 — Check that `QueuesModule` is imported in `AppModule`.**

Verify that `OPENAPI_GENERATE` is not set to `true` in the environment, which would exclude `QueuesModule` from the application.

### Resolution

| Root Cause | Resolution |
|---|---|
| Queue is paused | `POST /api/v1/queues/:queueName/resume` |
| Worker process crashed | Restart the application; investigate crash logs |
| Redis unreachable | Fix Redis connectivity (see scenario 4) |
| `QueuesModule` not imported | Ensure `OPENAPI_GENERATE !== 'true'` and `QueuesModule` is in `AppModule.imports` |
| Processor not registered | Verify the processor class is listed in `QueuesModule.providers` |

---

## 2. High Redis Memory Usage

### Symptoms

- Redis memory usage is growing steadily over time.
- Redis logs show `OOM command not allowed` or eviction warnings.
- New jobs fail to enqueue with a Redis write error.

### Diagnostic Steps

**Step 1 — Check Redis memory usage.**

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD info memory | grep used_memory_human
```

**Step 2 — Count completed and failed jobs per queue.**

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/stats
```

Look for large `completed` counts on queues where `removeOnComplete: false` (especially `blockchain`).

**Step 3 — Check the Redis eviction policy.**

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD config get maxmemory-policy
```

If the policy is not `noeviction`, Redis may be silently evicting job data.

**Step 4 — Identify large key namespaces.**

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --bigkeys
```

Bull stores jobs under keys prefixed with `bull:<queueName>:`. Large counts here confirm queue data is the source of growth.

### Resolution

| Root Cause | Resolution |
|---|---|
| Completed blockchain jobs accumulating | Archive and remove old completed jobs via `POST /api/v1/queues/blockchain/jobs/:jobId/remove`; consider setting `removeOnComplete: 10000` |
| Failed jobs not being cleared | Investigate and resolve failures, then clear via the admin API |
| Wrong eviction policy | Set `maxmemory-policy noeviction` in `redis.conf` |
| Metrics history too large | Reduce `maxMetricsPerQueue` in `QueueMonitoringService` or increase collection interval |
| Insufficient `maxmemory` | Increase Redis `maxmemory` allocation |

---

## 3. Jobs Stuck in Active State

### Symptoms

- The `active` count is non-zero and not decreasing.
- The same job IDs appear in `active` across multiple health checks.
- No corresponding `completed` or `failed` entries appear for those jobs.

### Diagnostic Steps

**Step 1 — Identify the stuck jobs.**

```bash
# Get current stats to confirm active count
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/blockchain/stats

# Fetch details of a specific job
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/blockchain/jobs/<jobId>
```

Check `processedOn` — if it was set a long time ago and `finishedOn` is null, the job is stuck.

**Step 2 — Check worker process health.**

```bash
ps aux | grep node
```

If the worker process has crashed or is unresponsive, active jobs will remain in the `active` state indefinitely (Bull does not automatically time out active jobs).

**Step 3 — Check for processor deadlocks or infinite loops.**

Review application logs for the affected processor around the time the job became active. Look for:
- Missing `completed` or `error` log lines after the job started.
- Repeated log lines suggesting an infinite loop.
- No log output at all (suggesting the process hung).

**Step 4 — Check Bull's lock TTL.**

Bull uses a lock mechanism to prevent multiple workers from processing the same job. If a worker crashes while holding a lock, the lock expires after `lockDuration` milliseconds (default: 30 000 ms). After expiry, another worker can pick up the job.

If jobs are stuck for longer than `lockDuration`, the worker holding the lock is likely still running but unresponsive.

### Resolution

| Root Cause | Resolution |
|---|---|
| Worker process crashed | Restart the application; Bull will re-queue the job after lock expiry |
| Processor hanging on external call | Add a timeout to the external call; restart the worker |
| Infinite loop in processor | Fix the processor logic; restart the worker |
| Lock not expiring | Verify `lockDuration` is set appropriately; restart the worker to release the lock |

To force-remove a stuck active job (use with caution — the job will be lost):

```bash
curl -X POST \
     -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/blockchain/jobs/<jobId>/remove
```

---

## 4. Redis Connection Failures

### Symptoms

- Application logs show `Error: connect ECONNREFUSED` or `Error: Redis connection lost`.
- All queues show `0` for all job counts.
- New job enqueue calls throw errors.
- The health endpoint returns `500 Internal Server Error`.

### Diagnostic Steps

**Step 1 — Test basic Redis connectivity.**

```bash
# Traditional Redis
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Upstash REST API
curl -H "Authorization: Bearer $REDIS_TOKEN" $REDIS_URL/ping
```

**Step 2 — Verify environment variables are set correctly.**

```bash
echo "REDIS_HOST=$REDIS_HOST"
echo "REDIS_PORT=$REDIS_PORT"
echo "REDIS_URL=$REDIS_URL"
```

Missing or incorrect values are the most common cause of connection failures in new environments.

**Step 3 — Check TLS configuration.**

If `REDIS_TLS=true` is set but the Redis server does not have TLS enabled (or vice versa), the connection will fail. Verify the TLS setting matches the server configuration.

**Step 4 — Check network/firewall rules.**

Ensure the application host can reach the Redis host on the configured port. In containerised environments, verify that the Redis service is on the same Docker network as the application.

**Step 5 — Check Redis server logs.**

```bash
# On the Redis host
tail -f /var/log/redis/redis-server.log
```

Look for `max number of clients reached`, `out of memory`, or authentication errors.

### Resolution

| Root Cause | Resolution |
|---|---|
| Wrong `REDIS_HOST` / `REDIS_PORT` | Correct the environment variables and restart |
| Wrong `REDIS_PASSWORD` | Update the password and restart |
| TLS mismatch | Align `REDIS_TLS` with the server's TLS configuration |
| Redis server down | Restart the Redis server; investigate the cause |
| Network/firewall blocking | Update firewall rules to allow traffic on the Redis port |
| Redis max clients reached | Increase `maxclients` in `redis.conf` or reduce connection pool size |
| Upstash token expired | Rotate the `REDIS_TOKEN` in Upstash dashboard and update the environment variable |

After fixing the root cause, the application's ioredis client will reconnect automatically using the configured `retryStrategy` (exponential backoff, max 2 000 ms). No restart is required unless environment variables were changed.

---

## 5. Using the Admin API for Job Inspection and Recovery

This scenario covers the workflow for investigating and recovering from a build-up of failed jobs using the admin API endpoints.

### Symptoms

- The `failed` count for one or more queues is non-zero and growing.
- `getQueueHealth` returns `"healthy": false` with the affected queue in `unhealthyQueues`.

### Diagnostic Steps

**Step 1 — Identify which queues have failed jobs.**

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/health
```

The `unhealthyQueues` array lists queues with more than 20 failed jobs or that are paused.

**Step 2 — List failed jobs for the affected queue.**

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/blockchain/failed
```

Review the `failedReason` field on each job to identify the root cause.

**Step 3 — Inspect a specific failed job.**

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/blockchain/jobs/<jobId>
```

Check `attemptsMade`, `failedReason`, and `stacktrace` for detailed failure information.

**Step 4 — Identify the pattern.**

Group failed jobs by `failedReason`. A single root cause (e.g., `Network timeout connecting to Stellar Horizon`) affecting many jobs indicates a systemic issue rather than individual job data problems.

### Recovery Workflow

**Option A — Retry after fixing the root cause**

Once the underlying issue is resolved (e.g., a network outage is over, a misconfigured credential is fixed):

```bash
# Retry a specific failed job
curl -X POST \
     -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/blockchain/jobs/<jobId>/retry
```

The job's `attemptsMade` counter resets to `0`, giving it a full new set of retry attempts.

**Option B — Remove unrecoverable jobs**

If a job's data is invalid and retrying will never succeed:

```bash
# Permanently remove the job
curl -X POST \
     -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/blockchain/jobs/<jobId>/remove
```

**Option C — Clear all failed jobs (use with caution)**

If all failed jobs are unrecoverable and you want to reset the queue:

```bash
# Clear all jobs from the queue (waiting, active, completed, failed)
curl -X POST \
     -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/queues/blockchain/clear
```

> **Warning:** `clear` removes ALL jobs, including waiting and active ones. Use only when you are certain no in-flight work will be lost.

### Prevention

- Set up monitoring alerts when `failed` count exceeds a threshold (e.g., > 5 for `blockchain`).
- Review failed jobs daily during the initial deployment period.
- Ensure processors log sufficient context (job ID, type, attempt number) to make `failedReason` actionable without needing to inspect the full job.
