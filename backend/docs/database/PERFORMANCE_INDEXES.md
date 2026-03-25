# Database Performance Indexes

## Overview

This document describes the performance indexes added to optimize query performance across the database. These indexes were added in migration `1740500000000-AddPerformanceIndexes.ts`.

## Performance Impact

Expected improvements:

- **Query Performance**: >50% improvement on common query patterns
- **Foreign Key Lookups**: Significant speedup on relationship queries
- **Search Operations**: Faster filtering and sorting
- **Write Performance**: Minimal impact due to selective indexing

## Indexes by Table

### Users Table

| Index Name                 | Columns             | Type                     | Purpose                                 |
| -------------------------- | ------------------- | ------------------------ | --------------------------------------- |
| `IDX_users_wallet_address` | `wallet_address`    | Partial (WHERE NOT NULL) | Stellar authentication lookups          |
| `IDX_users_role_is_active` | `role`, `is_active` | Composite                | Active user queries with role filtering |
| `IDX_users_kyc_status`     | `kyc_status`        | Single                   | KYC status filtering                    |
| `IDX_users_deleted_at`     | `deleted_at`        | Single                   | Soft delete queries                     |

**Query Patterns Optimized:**

```sql
-- Stellar auth lookup
SELECT * FROM users WHERE wallet_address = '...';

-- Active users by role
SELECT * FROM users WHERE role = 'landlord' AND is_active = true;

-- KYC pending users
SELECT * FROM users WHERE kyc_status = 'PENDING';
```

### Properties Table

| Index Name                   | Columns          | Type      | Purpose                            |
| ---------------------------- | ---------------- | --------- | ---------------------------------- |
| `IDX_properties_status_type` | `status`, `type` | Composite | Property search by status and type |
| `IDX_properties_city_status` | `city`, `status` | Composite | Location-based queries             |
| `IDX_properties_price`       | `price`          | Single    | Price range queries                |

**Query Patterns Optimized:**

```sql
-- Available apartments
SELECT * FROM properties WHERE status = 'published' AND type = 'apartment';

-- Properties in city
SELECT * FROM properties WHERE city = 'Lagos' AND status = 'published';

-- Price range search
SELECT * FROM properties WHERE price BETWEEN 100000 AND 500000;
```

### Rent Agreements Table

| Index Name                            | Columns                  | Type                     | Purpose                      |
| ------------------------------------- | ------------------------ | ------------------------ | ---------------------------- |
| `IDX_rent_agreements_landlord_id`     | `landlord_id`            | Single                   | Landlord's agreements lookup |
| `IDX_rent_agreements_tenant_id`       | `tenant_id`              | Single                   | Tenant's agreements lookup   |
| `IDX_rent_agreements_agent_id`        | `agent_id`               | Single                   | Agent's agreements lookup    |
| `IDX_rent_agreements_start_end_date`  | `start_date`, `end_date` | Composite                | Date range queries           |
| `IDX_rent_agreements_on_chain_status` | `on_chain_status`        | Partial (WHERE NOT NULL) | Blockchain sync status       |

**Query Patterns Optimized:**

```sql
-- Landlord's agreements
SELECT * FROM rent_agreements WHERE landlord_id = '...';

-- Active agreements in date range
SELECT * FROM rent_agreements
WHERE start_date <= NOW() AND end_date >= NOW();

-- Blockchain synced agreements
SELECT * FROM rent_agreements WHERE on_chain_status = 'synced';
```

### KYC Table

| Index Name                  | Columns                | Type      | Purpose                             |
| --------------------------- | ---------------------- | --------- | ----------------------------------- |
| `IDX_kyc_status_created_at` | `status`, `created_at` | Composite | Status filtering with time ordering |

**Query Patterns Optimized:**

```sql
-- Recent pending KYC submissions
SELECT * FROM kyc WHERE status = 'PENDING' ORDER BY created_at DESC;
```

### Stellar Escrows Table

| Index Name                                 | Columns                | Type                     | Purpose                    |
| ------------------------------------------ | ---------------------- | ------------------------ | -------------------------- |
| `IDX_stellar_escrows_rent_agreement_id`    | `rent_agreement_id`    | Partial (WHERE NOT NULL) | Agreement escrow lookups   |
| `IDX_stellar_escrows_blockchain_escrow_id` | `blockchain_escrow_id` | Partial (WHERE NOT NULL) | Blockchain escrow tracking |
| `IDX_stellar_escrows_dispute_id`           | `dispute_id`           | Partial (WHERE NOT NULL) | Disputed escrow queries    |

**Query Patterns Optimized:**

```sql
-- Escrow for agreement
SELECT * FROM stellar_escrows WHERE rent_agreement_id = '...';

-- Blockchain escrow lookup
SELECT * FROM stellar_escrows WHERE blockchain_escrow_id = '...';

-- Disputed escrows
SELECT * FROM stellar_escrows WHERE dispute_id IS NOT NULL;
```

### Disputes Table

| Index Name                             | Columns                   | Type                     | Purpose                     |
| -------------------------------------- | ------------------------- | ------------------------ | --------------------------- |
| `IDX_disputes_agreement_id`            | `agreement_id`            | Single                   | Agreement disputes lookup   |
| `IDX_disputes_initiated_by`            | `initiated_by`            | Single                   | User's initiated disputes   |
| `IDX_disputes_resolved_by`             | `resolved_by`             | Partial (WHERE NOT NULL) | Resolver's disputes         |
| `IDX_disputes_status_type`             | `status`, `dispute_type`  | Composite                | Status and type filtering   |
| `IDX_disputes_blockchain_agreement_id` | `blockchain_agreement_id` | Partial (WHERE NOT NULL) | Blockchain dispute tracking |
| `IDX_disputes_transaction_hash`        | `transaction_hash`        | Partial (WHERE NOT NULL) | Transaction hash lookups    |

**Query Patterns Optimized:**

```sql
-- Agreement disputes
SELECT * FROM disputes WHERE agreement_id = 123;

-- Open rent payment disputes
SELECT * FROM disputes WHERE status = 'OPEN' AND dispute_type = 'RENT_PAYMENT';

-- Blockchain dispute lookup
SELECT * FROM disputes WHERE blockchain_agreement_id = '...';
```

### Payments Table

| Index Name                       | Columns                | Type                     | Purpose                             |
| -------------------------------- | ---------------------- | ------------------------ | ----------------------------------- |
| `IDX_payments_agreement_id`      | `agreement_id`         | Partial (WHERE NOT NULL) | Agreement payments lookup           |
| `IDX_payments_status_created_at` | `status`, `created_at` | Composite                | Status filtering with time ordering |
| `IDX_payments_payment_method_id` | `payment_method_id`    | Partial (WHERE NOT NULL) | Payment method queries              |

**Query Patterns Optimized:**

```sql
-- Agreement payments
SELECT * FROM payments WHERE agreement_id = '...';

-- Recent completed payments
SELECT * FROM payments WHERE status = 'completed' ORDER BY created_at DESC;

-- Payments by method
SELECT * FROM payments WHERE payment_method_id = 123;
```

### Notifications Table

| Index Name                          | Columns              | Type      | Purpose                                        |
| ----------------------------------- | -------------------- | --------- | ---------------------------------------------- |
| `IDX_notifications_user_id_is_read` | `user_id`, `is_read` | Composite | Unread notifications by user                   |
| `IDX_notifications_type_created_at` | `type`, `created_at` | Composite | Notification type filtering with time ordering |

**Query Patterns Optimized:**

```sql
-- Unread notifications for user
SELECT * FROM notifications WHERE user_id = '...' AND is_read = false;

-- Recent payment notifications
SELECT * FROM notifications WHERE type = 'payment' ORDER BY created_at DESC;
```

### Arbiters Table

| Index Name                      | Columns            | Type                     | Purpose                  |
| ------------------------------- | ------------------ | ------------------------ | ------------------------ |
| `IDX_arbiters_active`           | `active`           | Single                   | Active arbiter queries   |
| `IDX_arbiters_user_id`          | `user_id`          | Partial (WHERE NOT NULL) | User arbiter lookup      |
| `IDX_arbiters_transaction_hash` | `transaction_hash` | Partial (WHERE NOT NULL) | Transaction hash lookups |

**Query Patterns Optimized:**

```sql
-- Active arbiters
SELECT * FROM arbiters WHERE active = true;

-- User's arbiter record
SELECT * FROM arbiters WHERE user_id = 123;
```

### Property Images & Amenities Tables

| Index Name                           | Columns       | Type   | Purpose                   |
| ------------------------------------ | ------------- | ------ | ------------------------- |
| `IDX_property_images_property_id`    | `property_id` | Single | Property images lookup    |
| `IDX_property_amenities_property_id` | `property_id` | Single | Property amenities lookup |

**Query Patterns Optimized:**

```sql
-- Property images
SELECT * FROM property_images WHERE property_id = '...';

-- Property amenities
SELECT * FROM property_amenities WHERE property_id = '...';
```

## Index Types Explained

### Single Column Index

Standard B-tree index on a single column for equality and range queries.

### Composite Index

Multi-column index that optimizes queries filtering on multiple columns. Column order matters - queries must use columns from left to right.

### Partial Index

Index with a WHERE clause that only indexes rows meeting specific criteria. Reduces index size and improves performance for targeted queries.

## Maintenance

### Monitoring Index Usage

```sql
-- Check index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check index size
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Analyzing Query Performance

```sql
-- Use EXPLAIN ANALYZE to verify index usage
EXPLAIN ANALYZE
SELECT * FROM users WHERE wallet_address = 'GXXX...';

-- Check for sequential scans (should use index instead)
EXPLAIN ANALYZE
SELECT * FROM properties WHERE status = 'published' AND type = 'apartment';
```

### Reindexing

If indexes become fragmented over time:

```sql
-- Reindex a specific index
REINDEX INDEX IDX_users_wallet_address;

-- Reindex entire table
REINDEX TABLE users;

-- Reindex entire database (during maintenance window)
REINDEX DATABASE chioma_db;
```

## Performance Testing

### Before Migration

Run baseline performance tests:

```bash
npm run perf
```

### After Migration

1. Run migration:

```bash
npm run migration:run
```

2. Run performance tests again:

```bash
npm run perf
```

3. Compare results to verify >50% improvement on common queries

### Load Testing

Use the performance benchmark script:

```bash
node scripts/performance-benchmark.mjs
```

## Rollback

If issues occur, rollback the migration:

```bash
npm run migration:revert
```

This will drop all indexes added by this migration.

## Best Practices

1. **Monitor Index Usage**: Regularly check `pg_stat_user_indexes` to ensure indexes are being used
2. **Avoid Over-Indexing**: Too many indexes can slow down writes
3. **Update Statistics**: Run `ANALYZE` after bulk data changes
4. **Vacuum Regularly**: Keep indexes healthy with regular `VACUUM ANALYZE`
5. **Review Query Plans**: Use `EXPLAIN ANALYZE` to verify index usage

## Related Documentation

- [Database Setup](../setup/QUICK_START.md)
- [Migration Guide](../deployment/DEPLOYMENT.md)
- [Performance Monitoring](../../monitoring/README.md)
