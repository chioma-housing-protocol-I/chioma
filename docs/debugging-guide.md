# Debugging Guide

A practical, step-by-step debugging reference for Chioma developers covering tools, techniques, common issues, and procedures for both local and production environments.

---

## Table of Contents

1. [Debugging Tools](#1-debugging-tools)
2. [Environment Setup](#2-environment-setup)
3. [Debugging Techniques](#3-debugging-techniques)
4. [Common Issues and Solutions](#4-common-issues-and-solutions)
5. [Remote Debugging](#5-remote-debugging)
6. [Database Debugging](#6-database-debugging)
7. [Performance Debugging](#7-performance-debugging)
8. [Log Analysis](#8-log-analysis)
9. [Profiling](#9-profiling)
10. [Best Practices](#10-best-practices)
11. [Debugging Checklist](#11-debugging-checklist)

---

## 1. Debugging Tools

### Backend (NestJS)

| Tool              | Purpose                        | Install                            |
| ----------------- | ------------------------------ | ---------------------------------- |
| Node.js Inspector | Built-in V8 debugger           | Ships with Node                    |
| VS Code Debugger  | IDE-integrated step debugging  | Built into VS Code                 |
| `ndb`             | Improved Node.js debugger      | `npm i -g ndb`                     |
| Sentry            | Production error tracking      | Configured via `SENTRY_DSN`        |
| Winston           | Structured application logging | Already integrated                 |
| Prometheus        | Metrics collection             | Enabled via `METRICS_ENABLED=true` |

### Frontend (Next.js)

| Tool                    | Purpose                             |
| ----------------------- | ----------------------------------- |
| Chrome DevTools         | DOM, network, JS debugging          |
| React DevTools          | Component tree and state inspection |
| Next.js Error Overlay   | Development-mode error display      |
| TanStack Query DevTools | Server state inspection             |
| Zustand DevTools        | Global state inspection             |

### Smart Contracts (Soroban/Rust)

| Tool                 | Purpose                        |
| -------------------- | ------------------------------ |
| `cargo test`         | Unit test contracts locally    |
| Stellar Laboratory   | Manual transaction inspection  |
| Soroban CLI          | Deploy and invoke contracts    |
| `stellar-cli` events | Watch on-chain contract events |

### Database

| Tool              | Purpose                       |
| ----------------- | ----------------------------- |
| `psql`            | Interactive PostgreSQL shell  |
| `EXPLAIN ANALYZE` | Query execution plan analysis |
| pgAdmin           | GUI for PostgreSQL            |
| TypeORM logging   | ORM-level query logging       |

---

## 2. Environment Setup

### VS Code Launch Configuration

Add to `.vscode/launch.json` at the repo root:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/backend",
      "port": 9229,
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Running Backend",
      "port": 9229,
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"]
    }
  ]
}
```

### Enable Debug Mode (Backend)

```bash
# Start backend with inspector
cd backend
npm run start:debug
# Node inspector binds to port 9229 by default
```

Add to `backend/package.json` if not present:

```json
"start:debug": "nest start --debug --watch"
```

### Enable TypeORM Query Logging

In `backend/src/database/data-source.ts` or `app.module.ts`:

```typescript
TypeOrmModule.forRoot({
  // ...
  logging: process.env.NODE_ENV !== "production",
  logger: "advanced-console",
});
```

Or per-request via environment variable:

```bash
TYPEORM_LOGGING=true npm run start:dev
```

### Enable Frontend Debug Logging

```bash
# Next.js verbose output
DEBUG=* npm run dev

# TanStack Query devtools (already included in dev build)
# Access at bottom of browser window in development
```

---

## 3. Debugging Techniques

### 3.1 Structured Logging

Chioma uses Winston for structured logs. Add contextual logging using the injected logger:

```typescript
import { Logger } from "@nestjs/common";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  async processPayment(dto: CreatePaymentDto): Promise<Payment> {
    this.logger.debug(`Processing payment`, {
      userId: dto.userId,
      amount: dto.amount,
    });

    try {
      const result = await this.stellarService.sendPayment(dto);
      this.logger.log(`Payment successful`, { transactionId: result.id });
      return result;
    } catch (error) {
      this.logger.error(`Payment failed`, {
        error: error.message,
        stack: error.stack,
        dto,
      });
      throw error;
    }
  }
}
```

### 3.2 Step-Through Debugging

1. Set a breakpoint by clicking the gutter in VS Code or adding `debugger;` in source.
2. Start the backend with **Debug Backend** launch config.
3. Trigger the code path via HTTP request (use the Swagger UI at `/api/docs`).
4. Inspect local variables in the **Variables** panel.
5. Use **Debug Console** to evaluate expressions at runtime.

### 3.3 Inspecting HTTP Requests

Use the built-in Swagger UI during development:

```
http://localhost:3000/api/docs
```

Or use `curl` for scripted testing:

```bash
# Authenticate
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chioma.local","password":"your-password"}' \
  | jq -r '.accessToken')

# Make authenticated request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/payments
```

### 3.4 Intercepting Async Errors

NestJS global exception filter catches unhandled errors. To trace the origin, ensure async functions always re-throw with context:

```typescript
async function riskyOperation() {
  try {
    await externalService.call();
  } catch (err) {
    throw new Error(`riskyOperation failed: ${err.message}`, { cause: err });
  }
}
```

### 3.5 Stellar Transaction Debugging

```typescript
// Inspect a built transaction before submitting
const txEnvelope = transaction.toEnvelope().toXDR("base64");
console.log("Transaction XDR:", txEnvelope);
// Paste into https://laboratory.stellar.org/#txsigner to inspect
```

---

## 4. Common Issues and Solutions

### 4.1 JWT Token Errors

**Symptom:** `401 Unauthorized` on authenticated endpoints.

**Cause / Fix:**

| Cause                          | Fix                                                               |
| ------------------------------ | ----------------------------------------------------------------- |
| Token expired                  | Refresh using `POST /api/v1/auth/refresh` with your refresh token |
| Wrong `JWT_SECRET` in env      | Ensure `JWT_SECRET` matches between token issuer and verifier     |
| Clock skew                     | Sync system clock; tokens are time-sensitive                      |
| Missing `Authorization` header | Header must be `Authorization: Bearer <token>`                    |

---

### 4.2 Database Connection Failures

**Symptom:** `ECONNREFUSED 127.0.0.1:5432` at startup.

**Fix:**

```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (Linux/macOS)
sudo systemctl start postgresql

# Confirm credentials match .env
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME
```

---

### 4.3 Redis Connection Issues

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:6379` in logs.

**Fix:**

```bash
# Check Redis is running
redis-cli ping  # Expected: PONG

# Start Redis
sudo systemctl start redis

# If using Upstash, verify REDIS_URL and REDIS_TOKEN are set
```

---

### 4.4 Stellar Account Not Found

**Symptom:** `404 Not Found` from Horizon when creating payments.

**Cause:** Account is unfunded — Stellar requires a minimum XLM balance (1 XLM on testnet).

**Fix:**

```bash
# Fund account on testnet via Friendbot
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

---

### 4.5 TypeORM Migration Errors

**Symptom:** `QueryFailedError: relation "table_name" already exists`.

**Fix:**

```bash
# Check which migrations have run
SELECT * FROM migrations ORDER BY timestamp DESC;

# Revert the last migration
npm run migration:revert

# Then re-run
npm run migration:run
```

---

### 4.6 Rate Limit Errors

**Symptom:** `429 Too Many Requests` during development.

**Fix:**

```bash
# Temporarily raise limits in .env for local dev
RATE_LIMIT_MAX=1000
RATE_LIMIT_AUTH_MAX=100
```

---

### 4.7 MFA Setup Failures

**Symptom:** TOTP codes are rejected.

**Cause:** Server clock drift.

**Fix:** Ensure server time is synchronized:

```bash
timedatectl status          # Linux
sudo ntpdate pool.ntp.org   # Force sync
```

---

### 4.8 S3 Upload Failures

**Symptom:** `AccessDenied` from AWS S3.

**Fix:**

1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set.
2. Confirm the IAM user has `s3:PutObject` permission on the bucket.
3. Check the `AWS_REGION` matches the bucket's region.

---

## 5. Remote Debugging

### 5.1 Debugging in Docker

Update `docker-compose.yml` to expose the inspector port:

```yaml
services:
  backend:
    command: node --inspect=0.0.0.0:9229 dist/main.js
    ports:
      - "3000:3000"
      - "9229:9229" # Expose debugger
    environment:
      - NODE_ENV=development
```

Then attach from VS Code using the **Attach to Running Backend** launch config (connect to `localhost:9229`).

### 5.2 Production Remote Debugging (Use with Caution)

> Never expose port 9229 in production. Use an SSH tunnel instead.

```bash
# On your local machine — tunnel remote inspector to localhost
ssh -L 9229:localhost:9229 user@production-server

# On the production server — restart Node with inspector bound to loopback only
node --inspect=127.0.0.1:9229 dist/main.js
```

Then attach VS Code to `localhost:9229` locally.

### 5.3 Debugging Kubernetes Pods

```bash
# Get pod name
kubectl get pods -n chioma

# Exec into pod
kubectl exec -it <pod-name> -n chioma -- /bin/sh

# Port-forward inspector
kubectl port-forward <pod-name> 9229:9229 -n chioma
```

---

## 6. Database Debugging

### 6.1 Enable Slow Query Logging

In `postgresql.conf`:

```
log_min_duration_statement = 500   # Log queries slower than 500ms
log_statement = 'all'              # Log all queries (dev only)
```

Chioma's backend also logs slow requests above `LOG_SLOW_REQUEST_THRESHOLD` (default 500ms).

### 6.2 Analyze a Slow Query

```sql
-- View execution plan
EXPLAIN ANALYZE
SELECT p.*, u.first_name, u.last_name
FROM properties p
JOIN users u ON u.id = p.landlord_id
WHERE p.status = 'published'
  AND p.city = 'Lagos'
ORDER BY p.created_at DESC
LIMIT 20;
```

Look for:

- `Seq Scan` on large tables → missing index
- High `actual rows` vs `estimated rows` → stale statistics → run `ANALYZE`
- Nested loops on large sets → consider a hash join via index

### 6.3 Check Active Connections and Locks

```sql
-- Active connections
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE state != 'idle';

-- Blocking locks
SELECT pid, relation::regclass, mode, granted
FROM pg_locks
WHERE NOT granted;

-- Kill a blocking query
SELECT pg_terminate_backend(<pid>);
```

### 6.4 TypeORM Query Logging per Module

```typescript
// Temporarily enable logging for a specific repository call
const payments = await this.paymentRepo
  .createQueryBuilder("payment")
  .leftJoinAndSelect("payment.user", "user")
  .where("payment.status = :status", { status: "pending" })
  .getMany();

// Log the generated SQL
const [query, params] = this.paymentRepo
  .createQueryBuilder("payment")
  .where("payment.status = :status", { status: "pending" })
  .getQueryAndParameters();
console.log("SQL:", query, "Params:", params);
```

---

## 7. Performance Debugging

### 7.1 Identify Bottlenecks with Prometheus

Prometheus metrics are exposed at `GET /metrics` when `METRICS_ENABLED=true`.

Key metrics to watch:

| Metric                                | Alert Threshold        |
| ------------------------------------- | ---------------------- |
| `http_request_duration_seconds` (p95) | > 500ms                |
| `nodejs_heap_used_bytes`              | > 80% of heap limit    |
| `process_cpu_seconds_total` (rate)    | > 80%                  |
| `pg_stat_activity_count`              | > connection pool size |

### 7.2 Profile Node.js CPU Usage

```bash
# Start with profiling
node --prof dist/main.js

# Generate readable output
node --prof-process isolate-*.log > profile.txt
cat profile.txt | head -100
```

### 7.3 Heap Snapshot Analysis

```typescript
// Add a temporary admin-only endpoint for heap dumps (remove after use)
import v8 from 'v8';
import fs from 'fs';

@Get('admin/heap-snapshot')
@Roles(Role.ADMIN)
dumpHeap() {
  const snapshot = v8.writeHeapSnapshot();
  return { file: snapshot };
}
```

Load the snapshot file in Chrome DevTools → Memory tab → Load profile.

### 7.4 Diagnose Memory Leaks

Watch for heap growth in the health endpoint:

```bash
curl http://localhost:3000/health/detailed | jq '.memory'
```

Common causes in NestJS:

- Event listeners not removed from `EventEmitter`
- Global caches without TTL
- Circular references in entities

---

## 8. Log Analysis

### 8.1 Log Format

Chioma uses Winston with structured JSON logging in production and simple text in development (controlled by `LOG_FORMAT`).

**JSON Log Example:**

```json
{
  "level": "error",
  "message": "Payment failed",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "context": "PaymentService",
  "userId": "a1b2c3",
  "error": "insufficient_funds",
  "traceId": "xyz-789"
}
```

### 8.2 Filter Logs by Level

```bash
# View only errors from the last hour
tail -f logs/app.log | grep '"level":"error"'

# Pretty-print with jq
tail -f logs/app.log | jq 'select(.level == "error")'
```

### 8.3 Trace a Request End-to-End

Use the `traceId` (request correlation ID) to follow a single request through all log entries:

```bash
grep '"traceId":"abc-123"' logs/app.log | jq .
```

### 8.4 Log Rotation

Configured via environment variables:

```
LOG_MAX_FILES=7d      # Retain 7 days of logs
LOG_MAX_SIZE=10m      # Rotate at 10MB
```

Log files are stored in `backend/logs/`.

---

## 9. Profiling

### 9.1 Clinic.js (Recommended for Node.js)

```bash
npm install -g clinic

# CPU profile
clinic doctor -- node dist/main.js

# Flame graph
clinic flame -- node dist/main.js

# I/O bubbles
clinic bubbles -- node dist/main.js
```

Open the generated HTML report for visual analysis.

### 9.2 Autocannon for Load Testing

```bash
npm install -g autocannon

# Benchmark the properties listing endpoint
autocannon -c 50 -d 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/properties
```

### 9.3 Soroban Contract Profiling

```bash
# Run contract tests with gas reporting
cd contract
cargo test -- --nocapture 2>&1 | grep "gas"

# Simulate a transaction to get resource usage
stellar contract invoke \
  --id $CONTRACT_ID \
  --source $ADMIN_KEY \
  --network testnet \
  --fee 1000000 \
  -- your_function_name
```

---

## 10. Best Practices

1. **Never commit `console.log` statements.** Use the NestJS `Logger` service — it respects `LOG_LEVEL` and is structured.

2. **Add context to every log.** Include `userId`, `requestId`, or entity IDs so logs are traceable.

3. **Use `debugger` only locally.** Remove all `debugger` statements before pushing.

4. **Reproduce before fixing.** Write a failing test that demonstrates the bug before touching production code.

5. **Read the stack trace completely.** The root cause is often at the bottom of the trace, not the top.

6. **Isolate the layer.** Determine whether a bug is in the HTTP handler, service, repository, or database before debugging all of them.

7. **Check environment variables first.** A large percentage of environment-specific bugs stem from misconfigured or missing `.env` values.

8. **Use feature flags for risky changes.** Toggle new behavior on/off without redeployment using environment variables.

9. **Never debug in production with live data.** Use a production-mirrored staging environment.

10. **Document the fix.** After resolving a non-obvious bug, add a comment explaining why the fix works to prevent regression.

---

## 11. Debugging Checklist

Use this checklist when investigating any bug report:

### Initial Triage

- [ ] Reproduce the issue locally
- [ ] Identify the affected layer (frontend, API, DB, blockchain)
- [ ] Check recent git commits for related changes (`git log --oneline -20`)
- [ ] Confirm environment variables are correct (`.env` vs `.env.example`)

### Backend Bugs

- [ ] Check application logs for error messages and stack traces
- [ ] Enable TypeORM query logging if a database issue is suspected
- [ ] Verify the request reaches the controller (add log at handler entry)
- [ ] Check Redis connectivity if caching or queues are involved
- [ ] Review rate-limit settings if requests are being rejected

### Frontend Bugs

- [ ] Inspect browser console for errors
- [ ] Check Network tab for failed API calls (status codes, response bodies)
- [ ] Inspect React component state with React DevTools
- [ ] Verify TanStack Query cache state for stale data issues

### Stellar / Blockchain Bugs

- [ ] Check the transaction XDR in Stellar Laboratory
- [ ] Verify account is funded (minimum XLM balance)
- [ ] Confirm the correct network is set (`STELLAR_NETWORK=testnet|mainnet`)
- [ ] Review contract event logs for state transitions

### Performance Issues

- [ ] Check Prometheus metrics for elevated p95 latency
- [ ] Run `EXPLAIN ANALYZE` on suspected slow queries
- [ ] Review heap usage in `/health/detailed`
- [ ] Profile with Clinic.js if CPU is spiking

### Resolution

- [ ] Write a test that reproduces the bug
- [ ] Apply the fix
- [ ] Verify the test passes
- [ ] Check for similar patterns elsewhere in the codebase
- [ ] Add a log or comment explaining the fix

---

## Related Documentation

- [Database Migration Standards](database-migration-standards.md)
- [Database Performance Optimization](database-performance-optimization.md)
- [Infrastructure as Code](infrastructure-as-code.md)
