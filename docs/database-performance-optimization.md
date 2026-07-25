# Database Performance Optimization

Indexing strategies, query optimization, execution plan analysis, caching, connection pooling, monitoring, benchmarking, and troubleshooting for Chioma's PostgreSQL database.

---

## Table of Contents

1. [Index Strategy](#1-index-strategy)
2. [Query Optimization](#2-query-optimization)
3. [Execution Plans](#3-execution-plans)
4. [Caching](#4-caching)
5. [Connection Pooling](#5-connection-pooling)
6. [Performance Monitoring](#6-performance-monitoring)
7. [Benchmarking](#7-benchmarking)
8. [Query Profiling](#8-query-profiling)
9. [Scaling Strategies](#9-scaling-strategies)
10. [Performance Troubleshooting](#10-performance-troubleshooting)
11. [Performance Checklist](#11-performance-checklist)

---

## 1. Index Strategy

### 1.1 When to Add an Index

Add an index when:

- A column appears frequently in `WHERE`, `JOIN ON`, or `ORDER BY` clauses
- A query scans more than 10% of a table
- A foreign key column has no index (TypeORM does not auto-create these)
- A `LIKE` pattern search uses a left-anchored prefix (`LIKE 'Lagos%'`)

Do **not** add an index when:

- The table has fewer than ~10,000 rows (sequential scan is faster)
- The column has very low cardinality (e.g., a boolean) unless combined with other columns
- Write throughput on the table is already a bottleneck

### 1.2 Index Types

| Type | Use Case | Example |
|---|---|---|
| B-tree (default) | Equality and range queries | `WHERE status = 'published'` |
| GIN | JSONB, arrays, full-text search | `WHERE amenities @> '["parking"]'` |
| GiST | Geometric / PostGIS data | Geographic proximity search |
| Hash | Exact equality only | High-traffic PK lookups (rarely needed) |
| Partial | Subset of rows | `WHERE status = 'published'` — index only published rows |
| Composite | Multiple column filters | `WHERE city = 'Lagos' AND status = 'published'` |
| Expression | Computed values | `LOWER(email)` for case-insensitive lookup |

### 1.3 Key Indexes in Chioma

```sql
-- Properties: most common listing query
CREATE INDEX idx_properties_city_status_created
  ON properties (city, status, created_at DESC)
  WHERE status = 'published';

-- Payments: status filters + createdAt sort (issue #1405)
-- Covers PaymentService.listPayments: WHERE user_id + status, ORDER BY created_at DESC
CREATE INDEX "IDX_payments_user_status_created_at"
  ON payments (user_id, status, created_at);
-- Verify planner: pnpm --dir backend run db:verify-payment-status-index
-- Benchmark (~2M rows): Bitmap Heap Scan + Sort ~41.9ms → Index Scan Backward ~0.37ms (~114x)

-- Users: email login (case-insensitive)
CREATE UNIQUE INDEX idx_users_email_lower
  ON users (LOWER(email));

-- Stellar transactions: account + timestamp range
CREATE INDEX idx_stellar_txns_account_created
  ON stellar_transactions (account_id, created_at DESC);

-- Full-text property search (GIN on stored search_vector — issue #1407)
-- Used by PropertyQueryBuilder.applySearchFilter and SearchService
CREATE INDEX "IDX_properties_search_vector"
  ON properties USING GIN (search_vector);
-- Strategy: prefer search_vector @@ plainto_tsquery over LIKE '%…%' so the
-- planner can use the GIN index. Address ILIKE remains as a narrow fallback.

-- JSONB amenities filter
CREATE INDEX idx_properties_amenities
  ON properties USING GIN (amenities);
```

### 1.4 Creating Indexes Without Downtime

Always use `CONCURRENTLY` for indexes on production tables:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status
  ON payments (status)
  WHERE status IN ('pending', 'processing');
```

> `CONCURRENTLY` takes longer but does not lock the table. Run it during low-traffic hours.

### 1.5 Identifying Unused Indexes

```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

Indexes with `idx_scan = 0` are never used. Drop them to reduce write overhead.

---

## 2. Query Optimization

### 2.1 Select Only Required Columns

```typescript
// ❌ Fetches all 30+ columns
const properties = await this.propertyRepo.find();

// ✅ Select only what the API response needs
const properties = await this.propertyRepo
  .createQueryBuilder('p')
  .select(['p.id', 'p.title', 'p.price', 'p.city', 'p.status'])
  .where('p.status = :status', { status: 'published' })
  .getMany();
```

### 2.2 Avoid N+1 Queries

```typescript
// ❌ N+1: one query per property to load landlord
const properties = await this.propertyRepo.find();
for (const p of properties) {
  p.landlord = await this.userRepo.findOne({ where: { id: p.landlordId } });
}

// ✅ Single query with JOIN
const properties = await this.propertyRepo
  .createQueryBuilder('p')
  .leftJoinAndSelect('p.landlord', 'landlord')
  .where('p.status = :status', { status: 'published' })
  .getMany();
```

### 2.3 Pagination

Always paginate large result sets. Use cursor-based pagination for stable ordering:

```typescript
// Offset-based (simple, use for low page numbers)
const [properties, total] = await this.propertyRepo.findAndCount({
  where: { status: 'published' },
  take: 20,
  skip: (page - 1) * 20,
  order: { createdAt: 'DESC' },
});

// Cursor-based (efficient for large datasets)
const properties = await this.propertyRepo
  .createQueryBuilder('p')
  .where('p.created_at < :cursor', { cursor: lastSeenCreatedAt })
  .andWhere('p.status = :status', { status: 'published' })
  .orderBy('p.created_at', 'DESC')
  .limit(20)
  .getMany();
```

### 2.4 Batch Inserts

```typescript
// ❌ One INSERT per row
for (const payment of payments) {
  await this.paymentRepo.save(payment);
}

// ✅ Single INSERT for all rows
await this.paymentRepo
  .createQueryBuilder()
  .insert()
  .into(Payment)
  .values(payments)
  .execute();
```

### 2.5 Use Raw Queries for Aggregations

TypeORM ORM layer adds overhead for aggregate queries. Use raw SQL:

```typescript
const stats = await this.dataSource.query(`
  SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS payment_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount
  FROM payments
  WHERE tenant_id = $1
    AND status = 'completed'
    AND created_at >= NOW() - INTERVAL '12 months'
  GROUP BY 1
  ORDER BY 1 DESC
`, [tenantId]);
```

### 2.6 Avoid Functions on Indexed Columns in WHERE

```sql
-- ❌ Index on email is not used (function wraps the column)
WHERE LOWER(email) = 'user@example.com'

-- ✅ Use a functional index instead
CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));
-- Then query:
WHERE LOWER(email) = 'user@example.com'  -- now uses the functional index
```

---

## 3. Execution Plans

### 3.1 Reading an Execution Plan

```sql
EXPLAIN ANALYZE
SELECT p.id, p.title, p.price, u.first_name
FROM properties p
JOIN users u ON u.id = p.landlord_id
WHERE p.city = 'Lagos'
  AND p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 20;
```

**Key nodes to understand:**

| Node | What it means |
|---|---|
| `Seq Scan` | Full table scan — consider adding an index |
| `Index Scan` | Uses an index — generally good |
| `Index Only Scan` | All data served from the index — best case |
| `Bitmap Heap Scan` | Index + heap fetch — common for range queries |
| `Hash Join` | Efficient for large datasets |
| `Nested Loop` | Efficient for small inner sets; expensive for large ones |
| `Sort` | Sorting without an index — consider adding one |

**Red flags:**

- `Rows Removed by Filter` is large → index is not selective enough
- Actual rows >> estimated rows → run `ANALYZE` to update statistics
- `Buffers: shared hit=0 read=N` → data not in cache (cold query)

### 3.2 Auto-Explain for Slow Queries

Add to `postgresql.conf`:

```
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = 500   # ms
auto_explain.log_analyze = on
auto_explain.log_buffers = on
```

### 3.3 Using pgBadger

Parse PostgreSQL logs for slow query analysis:

```bash
pgbadger /var/log/postgresql/postgresql.log -o report.html
open report.html
```

---

## 4. Caching

### 4.1 Application-Level Caching (Redis)

Chioma uses Redis (or Upstash) via `NestJS CacheManager`. Cache queries that are:

- Expensive to compute
- Read frequently
- Acceptable to be stale for a short period

```typescript
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('properties')
export class PropertyController {
  @Get('featured')
  @CacheKey('properties:featured')
  @CacheTTL(300)  // 5 minutes
  getFeatured() {
    return this.propertyService.getFeatured();
  }
}
```

Or using the `@Cached()` decorator in the service layer:

```typescript
@Cached('properties:stats', 600)
async getPropertyStats(): Promise<PropertyStats> {
  return this.dataSource.query(`
    SELECT city, COUNT(*) as count FROM properties
    WHERE status = 'published'
    GROUP BY city
  `);
}
```

### 4.2 PostgreSQL Buffer Cache

PostgreSQL caches frequently-read pages in shared memory. Size the cache appropriately:

```
# postgresql.conf
shared_buffers = 256MB             # 25% of RAM for dedicated DB servers
effective_cache_size = 768MB       # 75% of RAM (hint to query planner)
```

### 4.3 Cache Invalidation

```typescript
// Invalidate a specific key after a write
async updateProperty(id: string, dto: UpdatePropertyDto): Promise<Property> {
  const property = await this.propertyRepo.save({ id, ...dto });
  await this.cacheManager.del(`property:${id}`);
  await this.cacheManager.del('properties:featured');
  return property;
}
```

### 4.4 Caching Decision Matrix

| Data | TTL | Strategy |
|---|---|---|
| Property details | 5 min | Cache on read, invalidate on update |
| Featured listings | 5 min | Time-based expiry |
| User profile | 10 min | Cache on read, invalidate on update |
| Payment history | 1 min | Short TTL (frequently updated) |
| Auth tokens | Per JWT expiry | Do not cache — validate live |
| Stellar balances | 30 sec | Short TTL (on-chain data) |

---

## 5. Connection Pooling

### 5.1 TypeORM Pool Configuration

```typescript
// backend/src/database/data-source.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  extra: {
    // Pool settings
    max: 20,          // Maximum connections in the pool
    min: 2,           // Minimum idle connections
    acquire: 30000,   // Max ms to wait for a connection
    idle: 10000,      // ms before idle connection is released
  },
})
```

### 5.2 Sizing the Connection Pool

```
Max connections = (2 × CPU cores) + effective spindle count
```

For a 4-core server: `max = 10–20`

> Never exceed PostgreSQL's `max_connections` (default 100). Reserve some connections for admin and monitoring tools.

### 5.3 PgBouncer for High Concurrency

For applications with many short-lived connections (serverless, many pods), add PgBouncer in transaction-pooling mode:

```ini
# pgbouncer.ini
[databases]
chioma = host=postgres port=5432 dbname=chioma_db

[pgbouncer]
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20
server_idle_timeout = 60
```

### 5.4 Monitor Pool Health

```sql
-- Active vs idle connections
SELECT state, COUNT(*) FROM pg_stat_activity GROUP BY state;

-- Long-running queries (> 30 seconds)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '30 seconds';
```

---

## 6. Performance Monitoring

### 6.1 Prometheus Metrics

Enable via environment variable:

```
METRICS_ENABLED=true
```

Key metrics exposed at `GET /metrics`:

| Metric | Alert Threshold |
|---|---|
| `http_request_duration_seconds{quantile="0.95"}` | > 500ms |
| `pg_stat_activity_count` | > 80% of max pool |
| `nodejs_heap_used_bytes` | > 80% of heap |

### 6.2 pg_stat_statements

Enable the extension to track cumulative query stats:

```sql
-- Enable (requires server restart)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries by total time
SELECT
  calls,
  total_exec_time / 1000 AS total_sec,
  mean_exec_time AS mean_ms,
  query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Reset stats after analysis
SELECT pg_stat_statements_reset();
```

### 6.3 Table Bloat Check

```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS total_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)
    - pg_relation_size(tablename::regclass)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

### 6.4 Index Hit Rate

```sql
SELECT
  relname AS table,
  100 * idx_scan / NULLIF(idx_scan + seq_scan, 0) AS index_hit_pct,
  seq_scan,
  idx_scan
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

Target: index hit rate > 95% for frequently queried tables.

---

## 7. Benchmarking

### 7.1 pgbench — Built-in PostgreSQL Load Tool

```bash
# Initialize with scale factor 10 (~1.4M rows)
pgbench -i -s 10 chioma_db

# Run 60-second benchmark with 10 concurrent clients
pgbench -c 10 -T 60 chioma_db

# Custom query benchmark
pgbench -c 10 -T 60 -f benchmark.sql chioma_db
```

**benchmark.sql example:**

```sql
SELECT id, title, price, city FROM properties
WHERE status = 'published' AND city = 'Lagos'
ORDER BY created_at DESC LIMIT 20;
```

### 7.2 Autocannon — HTTP-Level Benchmarking

```bash
npm install -g autocannon

# Benchmark property listing endpoint
autocannon \
  -c 50 \           # 50 concurrent connections
  -d 30 \           # 30 second duration
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/properties?city=Lagos
```

### 7.3 Interpreting Benchmark Results

| Metric | Target |
|---|---|
| Latency p50 | < 50ms |
| Latency p95 | < 200ms |
| Latency p99 | < 500ms |
| Throughput | > 500 req/s for listing endpoints |
| Error rate | 0% |

### 7.4 Baseline and Track Over Time

Store benchmark results in a shared artifact (CI reports or a spreadsheet) to detect regressions. Run benchmarks:

- After every significant schema change
- Before and after index changes
- After upgrading PostgreSQL or Node.js versions

---

## 8. Query Profiling

### 8.1 Log Slow Queries (Backend)

Controlled via environment variable:

```
LOG_SLOW_REQUEST_THRESHOLD=500   # Log requests slower than 500ms
```

TypeORM slow query logging:

```typescript
TypeOrmModule.forRoot({
  // ...
  maxQueryExecutionTime: 500,   // Log queries slower than 500ms
  logging: ['error', 'warn', 'query'],
})
```

### 8.2 Profile a Specific Query

```sql
-- See actual vs estimated row counts and timing
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT p.*, u.first_name
FROM properties p
JOIN users u ON u.id = p.landlord_id
WHERE p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 20;
```

### 8.3 Update Table Statistics

After bulk inserts or data migrations, statistics may be stale:

```sql
-- Update stats for a specific table
ANALYZE properties;

-- Reclaim dead tuple space and update stats
VACUUM ANALYZE payments;

-- Force full rewrite (use during maintenance windows)
VACUUM FULL ANALYZE properties;
```

---

## 9. Scaling Strategies

### 9.1 Read Replicas

Route read-heavy operations (property listing, reporting) to a read replica:

```typescript
// In TypeORM data source config
replication: {
  master: { host: process.env.DB_HOST, ... },
  slaves: [
    { host: process.env.DB_REPLICA_HOST, ... }
  ]
}
```

TypeORM automatically routes `find*` queries to replicas and writes to master.

### 9.2 Vertical Scaling

Before horizontal scaling, squeeze performance from existing hardware:

```
# postgresql.conf tuning for 8GB RAM server
shared_buffers = 2GB
work_mem = 64MB          # Per sort/hash operation
maintenance_work_mem = 512MB
effective_cache_size = 6GB
max_parallel_workers_per_gather = 4
```

### 9.3 Table Partitioning

For tables that grow unboundedly (audit logs, transaction history), use range partitioning:

```sql
CREATE TABLE audit_logs (
  id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  -- ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2025_q1 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE audit_logs_2025_q2 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
```

### 9.4 Archive Old Data

Move historical data to a separate archive table to keep the hot table small:

```sql
-- Archive payments older than 2 years
INSERT INTO payments_archive
  SELECT * FROM payments WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM payments WHERE created_at < NOW() - INTERVAL '2 years';
```

---

## 10. Performance Troubleshooting

### High CPU

1. Check `pg_stat_activity` for long-running or looping queries.
2. Run `EXPLAIN ANALYZE` on the top CPU-consuming query.
3. Look for missing indexes causing sequential scans.
4. Check for autovacuum running on a large table — schedule during low traffic.

### High Memory

1. Check `work_mem` — if too high and many connections run sorts, OOM risk increases.
2. Look for unclosed cursors holding result sets in memory.
3. Check for memory leaks in the Node.js application (heap snapshots).

### Slow Writes

1. Check for too many indexes on write-heavy tables — each index adds write overhead.
2. Review `fsync` and `wal_level` settings — they trade safety for speed.
3. Use batched inserts instead of row-by-row saves.
4. Check for lock contention on `pg_locks`.

### Connection Exhaustion

1. Check `max_connections` in PostgreSQL vs actual concurrent connections.
2. Add PgBouncer in transaction-pooling mode.
3. Check for leaked connections (TypeORM query runners not released).

### Cache Misses

1. Inspect Redis hit/miss rate: `redis-cli info stats | grep keyspace`.
2. Review cache TTLs — too short means frequent DB hits.
3. Verify `effective_cache_size` is set correctly for the query planner.

---

## 11. Performance Checklist

### Index Health
- [ ] All foreign key columns have indexes
- [ ] Composite indexes match the column order of common `WHERE` clauses
- [ ] Unused indexes identified and dropped
- [ ] Large-table indexes created with `CONCURRENTLY`
- [ ] Partial indexes used for status-filtered queries

### Query Quality
- [ ] No `SELECT *` in production code paths
- [ ] No N+1 query patterns (use eager loading or DataLoader)
- [ ] All list endpoints are paginated
- [ ] Aggregations use raw SQL, not ORM overhead
- [ ] No functions on indexed columns in `WHERE` clauses

### Caching
- [ ] Frequently-read, rarely-updated data is cached in Redis
- [ ] Cache TTLs are appropriate for data freshness requirements
- [ ] Cache invalidation is triggered on every write to cached data
- [ ] PostgreSQL `shared_buffers` sized to 25% of available RAM

### Connection Pooling
- [ ] Connection pool `max` is within PostgreSQL `max_connections` limit
- [ ] Pool minimum idle connections set to avoid cold-start latency
- [ ] PgBouncer considered for high-concurrency deployments

### Monitoring
- [ ] `pg_stat_statements` extension enabled
- [ ] Slow query logging configured (> 500ms threshold)
- [ ] Prometheus metrics collected and dashboarded
- [ ] Alerts set for p95 latency > 500ms and connection pool exhaustion
- [ ] Weekly review of top-10 slowest queries from `pg_stat_statements`

---

## Related Documentation

- [Database Migration Standards](database-migration-standards.md)
- [Debugging Guide](debugging-guide.md)
- [Infrastructure as Code](infrastructure-as-code.md)
