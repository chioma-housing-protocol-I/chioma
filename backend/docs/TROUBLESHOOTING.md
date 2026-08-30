# Troubleshooting Guide

Common issues encountered when developing, deploying, and operating the Chioma backend, organised by area.

**Related documents:**

- [Configuration Troubleshooting](./CONFIGURATION_MANAGEMENT.md#troubleshooting) — env var issues
- [Incident Response Procedures](./INCIDENT_RESPONSE.md) — incident classification and runbooks
- [Error Handling](./ERROR_HANDLING.md) — exception filters and error responses
- [Caching Troubleshooting](./caching/troubleshooting.md) — cache-specific issues
- [Queue Troubleshooting](./queues/QUEUE_TROUBLESHOOTING.md) — Bull queue issues
- [Support and Maintenance](./SUPPORT-AND-MAINTENANCE.md) — SLAs, support channels

---

## Table of Contents

- [Application Startup Failures](#application-startup-failures)
- [Build and Compilation Errors](#build-and-compilation-errors)
- [Database Issues](#database-issues)
- [Authentication and Authorization](#authentication-and-authorization)
- [Redis / Cache Issues](#redis--cache-issues)
- [Bull Queue Issues](#bull-queue-issues)
- [Stellar / Blockchain Issues](#stellar--blockchain-issues)
- [Payment Processing Issues](#payment-processing-issues)
- [API Request and Response Issues](#api-request-and-response-issues)
- [Performance and Scaling Issues](#performance-and-scaling-issues)
- [File Upload and Storage Issues](#file-upload-and-storage-issues)
- [Email and Notification Issues](#email-and-notification-issues)
- [Docker / Container Issues](#docker--container-issues)
- [CI/CD Pipeline Issues](#cicd-pipeline-issues)
- [Common Error Codes](#common-error-codes)

---

## Application Startup Failures

### Error: `Missing required environment variables: RATE_LIMIT_TTL, ...`

**Cause:** One or more required rate-limiting variables are absent at startup.

**Checklist:**

- [ ] Is `.env.development` present? (local dev)
- [ ] Are all six `RATE_LIMIT_*` variables set?
- [ ] Has the environment file been loaded? (Check for typos in the filename)

**Resolution:**

```bash
# Copy the example file if missing
cp .env.example .env.development

# Or set the variables directly
export RATE_LIMIT_TTL=60000
export RATE_LIMIT_MAX=100
export RATE_LIMIT_AUTH_TTL=60000
export RATE_LIMIT_AUTH_MAX=5
export RATE_LIMIT_STRICT_TTL=60000
export RATE_LIMIT_STRICT_MAX=10
```

---

### Error: `Cannot find module '@nestjs/config'` or similar import error

**Cause:** Dependencies are not installed, or `node_modules` is corrupted.

**Checklist:**

- [ ] Has `pnpm install` been run?
- [ ] Is the lockfile (`pnpm-lock.yaml`) present?
- [ ] Is the correct package manager being used? (pnpm, not npm or yarn)

**Resolution:**

```bash
# Clean install
rm -rf node_modules
pnpm install --frozen-lockfile
```

---

### Error: `listen EADDRINUSE :::5000`

**Cause:** Another process is already using port 5000.

**Checklist:**

- [ ] Is another instance of the application running?
- [ ] Is another service using port 5000?

**Resolution:**

```bash
# Find the process using the port
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use a different port
export PORT=5001 && pnpm start:dev
```

---

### Error: `TypeError: Cannot read properties of undefined (reading 'split')`

**Cause:** A variable expected to be a string (often `CORS_ORIGINS`) is `undefined`.

**Checklist:**

- [ ] Is `CORS_ORIGINS` set in the environment?
- [ ] Is the variable populated, not empty?

**Resolution:** Set `CORS_ORIGINS` in the environment file. For local development:

```dotenv
CORS_ORIGINS=http://localhost:3000
```

---

## Build and Compilation Errors

### Error: `TypeScript error: Type 'X' is not assignable to type 'Y'`

**Cause:** Type mismatch, often after updating a dependency or entity definition.

**Checklist:**

- [ ] Are the entity and DTO types in sync?
- [ ] Has a dependency updated its type definitions?
- [ ] Does the interface match the implementation?

**Resolution:**

```bash
# Run type checking to see all errors at once
npx tsc --noEmit

# Check for recently changed type definitions
git diff --name-only HEAD~1 | grep -E "\.ts$"
```

---

### Error: `Build failed: Cannot find name 'X'`

**Cause:** Missing import or the module is not included in `tsconfig.json`.

**Checklist:**

- [ ] Is the module/file imported correctly?
- [ ] Is the module listed in `tsconfig.json` paths or includes?
- [ ] Is the dependency installed in `package.json`?

**Resolution:** Add the missing import or install the missing dependency:

```bash
pnpm add <missing-package>
```

---

### Error: `ESLint: Definition for rule 'X' was not found`

**Cause:** An ESLint plugin is missing or the config references a rule that doesn't exist.

**Checklist:**

- [ ] Is the ESLint plugin installed?
- [ ] Is the rule name spelled correctly in `eslint.config.mjs`?
- [ ] Has `eslint.config.mjs` been modified recently?

**Resolution:**

```bash
# Check the eslint config
npx eslint --print-config src/main.ts

# Reinstall linting dependencies
pnpm install
```

---

## Database Issues

### Error: `connect ECONNREFUSED <db-host>:5432`

**Cause:** PostgreSQL is not running, or `DB_HOST`/`DB_PORT` are incorrect.

**Checklist:**

- [ ] Is the database container running? (`docker compose ps postgres`)
- [ ] Are `DB_HOST` and `DB_PORT` correct in the environment file?
- [ ] Is the database port exposed? (`docker compose port postgres 5432`)

**Resolution:**

```bash
# Start the database
docker compose up -d postgres

# Verify connectivity
docker compose exec postgres pg_isready -U chioma

# Check exposed port
docker compose port postgres 5432
```

---

### Error: `password authentication failed for user "chioma"`

**Cause:** Wrong `DB_PASSWORD` or `DB_USERNAME`.

**Checklist:**

- [ ] Does the password match what was set in the database init?
- [ ] Are there any special characters that need escaping?
- [ ] Is the user created in the database?

**Resolution:**

```bash
# Reset the password in PostgreSQL
docker compose exec postgres psql -U postgres -c "ALTER USER chioma WITH PASSWORD 'new_password';"

# Update .env.development with the new password
```

---

### Error: `relation "X" does not exist`

**Cause:** Migrations have not been run, or the database is pointing to the wrong schema.

**Checklist:**

- [ ] Have migrations been run? (`pnpm run migration:show`)
- [ ] Does the database name match the environment?
- [ ] Is the correct schema being used?

**Resolution:**

```bash
# Check migration status
pnpm run migration:show

# Run pending migrations
pnpm run migration:run
```

---

### Error: `QueryFailedError: duplicate key value violates unique constraint`

**Cause:** An insert or update violates a unique constraint, typically during seeding or concurrent operations.

**Checklist:**

- [ ] Is the data being seeded already present?
- [ ] Is the application being started multiple times with seeding enabled?
- [ ] Is there a race condition in concurrent requests?

**Resolution:**

```bash
# For seeding — use upsert instead of insert
# For application code — wrap in try/catch and handle the duplicate gracefully
```

---

### Error: `QueryFailedError: deadlock detected`

**Cause:** Two or more transactions are waiting on each other's locks.

**Checklist:**

- [ ] Are there long-running transactions?
- [ ] Are concurrent requests modifying the same rows?
- [ ] Is the transaction isolation level correct?

**Resolution:**

```bash
# Identify blocking queries
psql "$DATABASE_URL" -c "
  SELECT blocked.pid AS blocked_pid, blocker.pid AS blocker_pid
  FROM pg_catalog.pg_locks blocked
  JOIN pg_catalog.pg_locks blocker ON blocked.pid != blocker.pid
    AND blocked.transactionid = blocker.transactionid
  WHERE NOT blocked.granted;
"

# Terminate the blocking process
SELECT pg_terminate_backend(<blocker_pid>);
```

---

## Authentication and Authorization

### Error: `JsonWebTokenError: invalid signature`

**Cause:** `JWT_SECRET` differs between the token issuer and the verifier.

**Checklist:**

- [ ] Was `JWT_SECRET` recently rotated?
- [ ] Are multiple instances using different secrets?
- [ ] Is the same secret used in staging and production?

**Resolution:**

```bash
# Verify the secret is consistent across all instances
# Rotate if needed — all users will need to re-authenticate
kubectl set env deployment/chioma-backend JWT_SECRET=<new-secret>
```

---

### Error: `TokenExpiredError: jwt expired`

**Cause:** The access token has expired and the client did not refresh it.

**Checklist:**

- [ ] Is the client calling the refresh endpoint before token expiry?
- [ ] Is `JWT_EXPIRATION` set to a reasonable value?
- [ ] Is the refresh token also expired?

**Resolution:** Adjust `JWT_EXPIRATION` and `JWT_REFRESH_EXPIRATION`:

```dotenv
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

---

### Error: `ForbiddenException — insufficient permissions`

**Cause:** The authenticated user lacks the required role or permission for the requested operation.

**Checklist:**

- [ ] Does the user have the correct role?
- [ ] Is the role/permission check using the correct guard?
- [ ] Is the permission assigned to the user in the database?

**Resolution:**

```bash
# Check user roles
psql "$DATABASE_URL" -c "
  SELECT u.email, r.name AS role
  FROM users u
  JOIN user_roles ur ON u.id = ur.user_id
  JOIN roles r ON ur.role_id = r.id
  WHERE u.email = 'user@example.com';
"

# Assign the missing role via admin API
curl -X POST https://admin.chioma.io/api/v1/admin/users/<id>/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles": ["property_manager"]}'
```

---

## Redis / Cache Issues

### Error: `connect ECONNREFUSED 127.0.0.1:6379`

**Cause:** Redis is not running, or `REDIS_HOST`/`REDIS_PORT` are wrong.

**Checklist:**

- [ ] Is Redis running? (`docker compose ps redis`)
- [ ] Are `REDIS_HOST` and `REDIS_PORT` correct?
- [ ] Is TLS enabled for Redis but the client expects a non-TLS connection?

**Resolution:**

```bash
# Start Redis
docker compose up -d redis

# Test connectivity
docker compose exec redis redis-cli ping
```

---

### Symptom: Cache hit rate is very low

**Cause:** Cache keys are changing too frequently, TTL is too short, or invalidation is too aggressive.

**Checklist:**

- [ ] Check the cache hit rate in Grafana (`cache_hit_ratio`)
- [ ] Are cache keys including volatile data (timestamps, user-specific values)?
- [ ] Was a recent deployment changed key formats?
- [ ] Is the TTL set appropriately for the data type?

**Resolution:**

```bash
# Check cache keys in Redis
docker compose exec redis redis-cli --scan --pattern "cache:*" | head -20

# Verify TTLs
docker compose exec redis redis-cli --scan --pattern "cache:properties:*" | head -1 | xargs docker compose exec redis redis-cli TTL
```

---

### Symptom: High Redis memory usage

**Cause:** Cache entries are not evicting, or there is a memory leak.

**Checklist:**

- [ ] Check `maxmemory` policy: `redis-cli config get maxmemory-policy`
- [ ] Check memory usage: `redis-cli info memory | grep used_memory_human`
- [ ] Are there keys without TTL? `redis-cli --scan --pattern "*" | xargs -I {} redis-cli TTL {} | grep -e "^-1" | wc -l`

**Resolution:**

```bash
# Set eviction policy to allkeys-lru
docker compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Or manually evict stale session keys
docker compose exec redis redis-cli --scan --pattern "session:*" | xargs docker compose exec redis redis-cli DEL
```

---

## Bull Queue Issues

### Symptom: Jobs are stuck in "waiting" or "delayed" state

**Cause:** Workers are not running, or all workers are busy with slow jobs.

**Checklist:**

- [ ] Are worker processes running?
- [ ] Check queue depth in Bull Board or Grafana
- [ ] Are there stalled jobs?
- [ ] Is Redis reachable from the workers?

**Resolution:**

```bash
# Check worker status
docker compose ps workers

# Restart workers
docker compose restart workers

# Manually process stalled jobs via Bull Board
# Navigate to /queues → stalled tab → retry
```

---

### Symptom: Jobs are failing repeatedly

**Cause:** A bug in the job processor, invalid input data, or a downstream dependency is unavailable.

**Checklist:**

- [ ] Check the failed jobs list in Bull Board
- [ ] Examine the error message for the failed job
- [ ] Is the job input data valid?
- [ ] Is the downstream service (email, blockchain, etc.) available?

**Resolution:**

```bash
# Retry all failed jobs via admin API
curl -X POST https://admin.chioma.io/api/v1/admin/queues/email/retry-failed \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Or via Bull Board: click "Retry All" on the failed tab
```

---

### Symptom: Queue backlog growing faster than workers can process

**Cause:** Worker count is too low, or jobs are taking longer than expected.

**Checklist:**

- [ ] Check the queue depth in Grafana
- [ ] Check average job processing time
- [ ] Are there enough workers?
- [ ] Is a specific job type causing the bottleneck?

**Resolution:**

```bash
# Scale up workers
kubectl scale deployment chioma-workers --replicas=5

# Or increase concurrency per worker
kubectl set env deployment/chioma-workers WORKER_CONCURRENCY=10
```

---

## Stellar / Blockchain Issues

### Error: `Stellar transaction failed: tx_bad_seq`

**Cause:** The account sequence number is out of sync. This typically happens when two transactions are submitted with the same sequence number.

**Checklist:**

- [ ] Are there concurrent processes submitting transactions for the same account?
- [ ] Was the sequence number fetched before a previous transaction was confirmed?
- [ ] Did a transaction submission timeout but actually succeeded?

**Resolution:**

```bash
# Fetch the current sequence number from Horizon
curl -s "https://horizon.stellar.org/accounts/<account_id>" | jq '.sequence'

# Update the local sequence number
# (The SDK should handle this automatically — if not, restart the service)
```

---

### Error: `Stellar transaction failed: op_underfunded`

**Cause:** The source account does not have enough XLM or asset balance to execute the operation.

**Checklist:**

- [ ] Check the account balance: `curl -s "https://horizon.stellar.org/accounts/<account_id>" | jq '.balances'`
- [ ] Is the admin account funded with enough XLM?
- [ ] Has the reserve balance been maintained (2 XLM minimum + 0.5 XLM per trustline)?

**Resolution:** Fund the account from a Stellar faucet (testnet) or transfer XLM (mainnet).

---

### Symptom: Slow Stellar transaction confirmation times

**Cause:** Network congestion or low fee bidding.

**Checklist:**

- [ ] Check Stellar network status: `https://dashboard.stellar.org`
- [ ] Check the `fee_charged` vs `max_fee` on recent transactions
- [ ] Are other applications competing for block space?

**Resolution:**

```bash
# Increase the max fee in the application config
kubectl set env deployment/chioma-backend STELLAR_MAX_FEE=10000
```

---

### Error: `Soroban RPC: request timed out`

**Cause:** The Soroban RPC endpoint is slow or unreachable.

**Checklist:**

- [ ] Is the RPC endpoint correct? (`SOROBAN_RPC_URL`)
- [ ] Is the endpoint reachable from the application?
- [ ] Is the network (testnet/mainnet) correct?

**Resolution:**

```bash
# Test the RPC endpoint
curl -X POST "$SOROBAN_RPC_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Switch to a backup RPC endpoint if needed
kubectl set env deployment/chioma-backend SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org
```

---

## Payment Processing Issues

### Error: `Paystack: Invalid API key`

**Cause:** `PAYSTACK_SECRET_KEY` is a test key in production, or the wrong key is being used.

**Checklist:**

- [ ] Is `PAYMENT_GATEWAY` set to `paystack` (not `mock`)?
- [ ] Is the secret key a live key (starts with `sk_live_`)?
- [ ] Does the key match the expected Paystack account?

**Resolution:**

```bash
# Verify the key prefix
echo $PAYSTACK_SECRET_KEY | grep -q "^sk_live_" && echo "Live key" || echo "Test key"

# Set the correct key
kubectl set env deployment/chioma-backend PAYSTACK_SECRET_KEY=sk_live_...
```

---

### Error: `Flutterwave: Transaction declined`

**Cause:** The payment was declined by the card issuer or the transaction validation failed.

**Checklist:**

- [ ] Check the Flutterwave dashboard for the decline reason
- [ ] Is the card supported in the operating country?
- [ ] Are the transaction limits being exceeded?

**Resolution:** Check the specific decline code in the payment logs and guide the user accordingly.

---

### Symptom: Payments are returning mock/placeholder responses

**Cause:** `PAYMENT_GATEWAY` is set to `mock` in staging or production.

**Checklist:**

- [ ] Check `PAYMENT_GATEWAY` value: `kubectl exec pod/chioma-backend -- env | grep PAYMENT_GATEWAY`

**Resolution:**

```bash
kubectl set env deployment/chioma-backend PAYMENT_GATEWAY=paystack
```

---

## API Request and Response Issues

### Error: `429 Too Many Requests`

**Cause:** The client has exceeded the rate limit for the endpoint.

**Checklist:**

- [ ] Is the rate limit appropriate for the client's usage pattern?
- [ ] Is the client using the correct rate limit key (IP, user ID, API key)?
- [ ] Are rate limit headers being respected?

**Resolution:** Adjust rate limits if needed:

```dotenv
RATE_LIMIT_MAX=200   # Increase general limit
RATE_LIMIT_TTL=60000 # Or shorten the window
```

---

### Error: `413 Request Entity Too Large`

**Cause:** The request body exceeds the maximum allowed size (1 MB for JSON, 10 MB for file uploads).

**Checklist:**

- [ ] Is the request payload reasonable?
- [ ] Are there large base64-encoded files in the JSON body?
- [ ] Should the file be uploaded via the dedicated file upload endpoint?

**Resolution:** Use the file upload endpoint for files, or increase the limit in `main.ts` for specific routes.

---

### Error: `401 Unauthorized — No auth token`

**Cause:** The request did not include an `Authorization` header.

**Checklist:**

- [ ] Is the client sending the `Authorization: Bearer <token>` header?
- [ ] Is the token stored and sent correctly by the frontend?
- [ ] Is the token included in WebSocket connections (if applicable)?

**Resolution:** Ensure the frontend includes the token in all authenticated requests.

---

### Error: `422 Unprocessable Entity`

**Cause:** The request body failed DTO validation (unknown property or invalid value).

**Checklist:**

- [ ] Check the response body for specific validation errors
- [ ] Is the request body matching the expected DTO shape?
- [ ] Are all required fields present?

**Resolution:** Update the request to match the DTO schema. Check Swagger docs at `/api/docs` for the expected format.

---

## Performance and Scaling Issues

### Symptom: High API latency (P95 > 500ms)

**Cause:** Slow database queries, insufficient caching, or resource contention.

**Checklist:**

- [ ] Check APM traces in Grafana or Sentry
- [ ] Which endpoints are slow? (Check by route in Grafana)
- [ ] Are slow queries appearing in `pg_stat_statements`?
- [ ] Is the cache hit rate normal?
- [ ] Are resources (CPU, memory) saturated?

**Resolution:**

```bash
# Identify slow queries
psql "$DATABASE_URL" -c "
  SELECT query, mean_exec_time, calls, rows
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Add missing indexes
# Check PERFORMANCE_INDEXES.md for index recommendations

# Scale up if needed
kubectl scale deployment chioma-backend --replicas=5
```

---

### Symptom: Node.js event loop lag

**Cause:** A synchronous CPU-intensive operation is blocking the event loop.

**Checklist:**

- [ ] Check event loop lag in Grafana (`nodejs_event_loop_lag_seconds`)
- [ ] Are there synchronous file reads, crypto operations, or JSON parsing of large payloads?
- [ ] Are Bull queue workers separating CPU-heavy tasks from the API?

**Resolution:**

- Offload CPU-intensive tasks to Bull queue workers
- Use `setImmediate()` or `queueMicrotask()` to yield the event loop
- Stream large JSON payloads instead of buffering

---

### Symptom: Out of Memory (OOM) kills

**Cause:** The application is using more memory than the container limit.

**Checklist:**

- [ ] Check memory usage trends in Grafana
- [ ] Are there memory leaks? (Heap snapshots over time)
- [ ] Are large file buffers being held in memory?
- [ ] Is the container memory limit appropriate?

**Resolution:**

```bash
# Increase memory limit (temporary)
kubectl set resources deployment/chioma-backend \
  -c=app --limits=memory=1Gi

# Take a heap snapshot for analysis
node -e "require('v8').getHeapSnapshot().pipe(require('fs').createWriteStream('heap.heapsnapshot'))"
```

---

## File Upload and Storage Issues

### Error: `S3Exception: Access Denied`

**Cause:** The AWS credentials lack permission to access the S3 bucket.

**Checklist:**

- [ ] Are `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` correct?
- [ ] Does the IAM user have the `s3:PutObject` and `s3:GetObject` permissions?
- [ ] Is the bucket policy restricting access?

**Resolution:**

```bash
# Verify credentials
aws sts get-caller-identity

# Test bucket access
aws s3 ls s3://chioma-files/
```

---

### Error: `File too large — exceeds 10 MB limit`

**Cause:** The uploaded file exceeds the maximum file size.

**Checklist:**

- [ ] Is the file size reasonable for the use case?
- [ ] Should the file be compressed before upload?
- [ ] Should the limit be increased for this endpoint?

**Resolution:** Compress the file before uploading, or use a dedicated large-file upload endpoint with multipart upload support.

---

## Email and Notification Issues

### Error: `Email transport failed: Invalid login`

**Cause:** `EMAIL_USER` or `EMAIL_PASSWORD` are incorrect.

**Checklist:**

- [ ] Are the credentials correct for the email provider?
- [ ] Has the app-specific password expired (Gmail)?
- [ ] Is 2FA enabled on the account (requires app password)?

**Resolution:** Generate a new app-specific password for Gmail or update SMTP credentials.

---

### Error: `Email transport failed: connect ETIMEDOUT`

**Cause:** The SMTP server is unreachable or the connection is being blocked.

**Checklist:**

- [ ] Is the SMTP host correct?
- [ ] Is port 465 (SSL) or 587 (TLS) open?
- [ ] Is the application running in a network that blocks outbound SMTP?

**Resolution:** Use a transactional email service (SendGrid, Mailgun, AWS SES) instead of direct SMTP.

---

## Docker / Container Issues

### Error: `port is already allocated`

**Cause:** The port required by a container is already in use on the host.

**Checklist:**

- [ ] Is another Docker container using the port?
- [ ] Is a local service using the port?

**Resolution:**

```bash
# Find what is using the port
sudo lsof -i :5432

# Stop the conflicting container or service
docker compose stop <container>
```

---

### Error: `no matching manifest for linux/arm64 in the manifest list entries`

**Cause:** A Docker image does not support the host architecture (ARM Mac vs. AMD64 Linux).

**Checklist:**

- [ ] Is the image multi-architecture?
- [ ] Is QEMU/binfmt installed for emulation?

**Resolution:**

```bash
# Enable cross-platform builds
docker run --privileged --rm tonistiigi/binfmt --install all

# Or use platform-specific images
docker compose build --platform linux/amd64
```

---

### Error: Container exits immediately with code 1

**Cause:** The application inside the container crashed on startup.

**Checklist:**

- [ ] Check the container logs: `docker compose logs <service>`
- [ ] Are environment variables set correctly?
- [ ] Is the database reachable from inside the container?

**Resolution:**

```bash
# Run the container interactively to debug
docker compose run --rm api sh

# Inside the container, run the app manually to see errors
node dist/main.js
```

---

## CI/CD Pipeline Issues

### Error: `GitHub Actions: No space left on device`

**Cause:** The GitHub Actions runner has run out of disk space.

**Resolution:**

```yaml
# Add a step to free up space in the workflow
- name: Free disk space
  run: |
    sudo rm -rf /usr/share/dotnet
    sudo rm -rf /usr/local/lib/android
    sudo rm -rf /opt/hostedtoolcache
```

---

### Error: Pipeline fails at `pnpm install` with lockfile mismatch

**Cause:** The `pnpm-lock.yaml` is out of sync with `package.json`.

**Checklist:**

- [ ] Was `package.json` modified without running `pnpm install`?
- [ ] Is the lockfile committed?

**Resolution:**

```bash
# Regenerate the lockfile
pnpm install

# Commit the updated lockfile
git add pnpm-lock.yaml
git commit -m "chore: update lockfile"
```

---

### Error: `Test failed: Cannot find module 'X'`

**Cause:** A test file has a missing import or the module path is incorrect.

**Checklist:**

- [ ] Is the import path correct?
- [ ] Is the module mock set up in the test file?
- [ ] Is the test configuration (Jest) mapping module paths correctly?

**Resolution:** Check the module path and Jest moduleNameMapper configuration in `package.json`.

---

## Common Error Codes

| Error Code            | HTTP Status | Meaning                         | Common Causes                            |
| --------------------- | ----------- | ------------------------------- | ---------------------------------------- |
| `UNAUTHORIZED`        | 401         | Authentication required         | Missing or invalid token                 |
| `FORBIDDEN`           | 403         | Insufficient permissions        | User lacks required role/permission      |
| `NOT_FOUND`           | 404         | Resource not found              | Invalid ID, deleted resource             |
| `VALIDATION_ERROR`    | 422         | Request validation failed       | Missing required field, wrong type       |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests               | Client exceeded rate limit               |
| `CONFLICT`            | 409         | Resource conflict               | Duplicate entry, concurrent modification |
| `INTERNAL_ERROR`      | 500         | Unexpected server error         | Unhandled exception, database failure    |
| `SERVICE_UNAVAILABLE` | 503         | Service temporarily unavailable | Dependency down, maintenance mode        |
| `BAD_REQUEST`         | 400         | Malformed request               | Invalid JSON, wrong content type         |
| `PAYMENT_FAILED`      | 402         | Payment processing failed       | Card declined, insufficient funds        |
| `DEPENDENCY_ERROR`    | 502         | External service error          | Stellar, Paystack, or S3 failure         |
| `TOKEN_EXPIRED`       | 401         | JWT has expired                 | Token beyond its TTL                     |
| `CSRF_INVALID`        | 403         | CSRF token validation failed    | Missing or mismatched CSRF token         |

---

## Escalation Path

If the issue cannot be resolved using this guide:

| Level                                 | Contact             | Response Time |
| ------------------------------------- | ------------------- | ------------- |
| L1: On-Call Engineer                  | PagerDuty           | 15 minutes    |
| L2: Backend Lead                      | Slack @backend-lead | 30 minutes    |
| L3: CTO / Engineering Lead            | Phone / Slack       | 1 hour        |
| L4: CEO / Legal (security/compliance) | Phone               | Immediate     |

When escalating, provide:

1. The exact error message and stack trace
2. Steps already taken
3. The environment (development, staging, production)
4. Any relevant logs or metrics

---

## Related Documentation

- [Configuration Management](./CONFIGURATION_MANAGEMENT.md) — environment setup and validation
- [Incident Response](./INCIDENT_RESPONSE.md) — formal incident response procedures
- [Error Handling](./ERROR_HANDLING.md) — application error taxonomy
- [Support and Maintenance](./SUPPORT-AND-MAINTENANCE.md) — SLAs and support channels
- [Deployment Runbook](./deployment/DEPLOYMENT.md) — deployment procedures
- [Database Recovery Runbook](./deployment/runbooks/RECOVERY_RUNBOOK.md) — database recovery
- [Queue Troubleshooting](./queues/QUEUE_TROUBLESHOOTING.md) — Bull queue specific issues
- [Caching Troubleshooting](./caching/troubleshooting.md) — Redis/cache specific issues
