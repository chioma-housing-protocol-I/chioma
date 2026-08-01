# Database Migration Standards

Standards, procedures, and best practices for creating, testing, deploying, and rolling back database migrations in the Chioma platform.

---

## Table of Contents

1. [Migration Overview](#1-migration-overview)
2. [Creation Process](#2-creation-process)
3. [Naming Conventions](#3-naming-conventions)
4. [Writing Migrations](#4-writing-migrations)
5. [Testing Migrations](#5-testing-migrations)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Production Deployment](#7-production-deployment)
8. [Zero-Downtime Strategies](#8-zero-downtime-strategies)
9. [Troubleshooting](#9-troubleshooting)
10. [Examples](#10-examples)
11. [Migration Checklist](#11-migration-checklist)

---

## 1. Migration Overview

Database migrations are versioned, incremental scripts that evolve the database schema in a controlled and repeatable way. They are the single source of truth for schema state.

**Why migrations matter:**

- Reproducible schema across all environments (local, staging, production)
- Tracked history of every structural change
- Safe, reversible updates via rollback
- Coordination across team members without manual SQL execution

Chioma uses **TypeORM migrations** backed by raw SQL files in `backend/src/database/migrations/`. The TypeORM CLI generates and runs migration files; raw SQL files are provided for DBA review and manual recovery.

**Migration flow:**

```
Development → Code Review → CI Testing → Staging Deploy → Production Deploy
```

---

## 2. Creation Process

### 2.1 Auto-Generate from Entity Changes

After modifying a TypeORM entity, generate a migration automatically:

```bash
cd backend

# Ensure the database is at the last known state
npm run migration:run

# Generate the migration diff
npm run migration:generate -- src/database/migrations/AddPropertyAmenities

# Review the generated file before committing
```

### 2.2 Create a Blank Migration (Manual)

For complex migrations that cannot be auto-generated (data backfills, column renames):

```bash
npm run migration:create -- src/database/migrations/BackfillPropertySlug
```

This creates a blank TypeScript migration file for you to fill in.

### 2.3 Verify the Generated Migration

Always review auto-generated output. Common issues to look for:

- Dropping columns that still have data
- Missing `NOT NULL` default values on new columns
- Incorrect foreign key references
- Index creation on large tables without `CONCURRENTLY`

### 2.4 Available Migration Commands

```bash
npm run migration:run       # Apply all pending migrations
npm run migration:revert    # Revert the last applied migration
npm run migration:generate  # Auto-generate migration from entity diff
npm run migration:create    # Create a blank migration file
npm run migration:show      # List all migrations and their status
```

---

## 3. Naming Conventions

### File Naming

```
<sequence>_<descriptive_snake_case_name>.<timestamp>.ts
```

Examples:

```
001_initial_schema.sql
002_update_schema.sql
1736000000000-AddPropertyAmenities.ts        ✅
1736000001000-BackfillPropertySlugs.ts       ✅
1736000002000-DropLegacyPaymentTable.ts      ✅
```

**Rules:**

| Rule                                                | Example                                         |
| --------------------------------------------------- | ----------------------------------------------- |
| Use PascalCase for TypeScript migration class names | `AddPropertyAmenities`                          |
| Use present-tense verb + entity + detail            | `AddPropertyAmenities`, `RemoveUserLegacyField` |
| Never use vague names                               | `UpdateSchema`, `FixBug` ❌                     |
| Never reuse a timestamp                             | Each migration must have a unique timestamp     |
| Prefix with sequence for raw SQL files              | `001_`, `002_`                                  |

### Class Naming

```typescript
// File: 1736000000000-AddPropertyAmenities.ts
export class AddPropertyAmenities1736000000000 implements MigrationInterface {
  // Timestamp appended to class name prevents name collisions
}
```

---

## 4. Writing Migrations

### 4.1 Structure

Every migration must implement both `up` (apply) and `down` (revert):

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddPropertyAmenities1736000000000 implements MigrationInterface {
  name = "AddPropertyAmenities1736000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "properties",
      new TableColumn({
        name: "amenities",
        type: "jsonb",
        isNullable: true,
        default: "'[]'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("properties", "amenities");
  }
}
```

### 4.2 Adding a Column Safely

When adding a `NOT NULL` column to a table with existing rows, always provide a default:

```typescript
// ✅ Safe: provides a server-side default for existing rows
await queryRunner.addColumn(
  "payments",
  new TableColumn({
    name: "currency",
    type: "varchar",
    length: "10",
    isNullable: false,
    default: "'USDC'",
  }),
);
```

Then, in a follow-up migration after the backfill is confirmed:

```typescript
// Optional: remove the default once all rows are populated
await queryRunner.changeColumn(
  "payments",
  "currency",
  new TableColumn({
    name: "currency",
    type: "varchar",
    length: "10",
    isNullable: false,
    // No default — now enforced at application level
  }),
);
```

### 4.3 Renaming a Column (Zero-Downtime)

Never rename a column in a single step on a live table. Use the expand/contract pattern:

**Step 1 — Expand:** Add the new column alongside the old one.

```typescript
await queryRunner.addColumn(
  "users",
  new TableColumn({
    name: "phone_number", // new name
    type: "varchar",
    isNullable: true,
  }),
);
```

**Step 2 — Backfill:** Copy data from old column to new.

```typescript
await queryRunner.query(`
  UPDATE users SET phone_number = phone WHERE phone IS NOT NULL
`);
```

**Step 3 — Deploy application** that writes to both columns.

**Step 4 — Contract:** Drop the old column once traffic no longer touches it.

```typescript
await queryRunner.dropColumn("users", "phone");
```

### 4.4 Adding an Index

For large tables, use `CONCURRENTLY` to avoid table locks:

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Cannot use queryRunner.createIndex here — use raw query for CONCURRENTLY
  await queryRunner.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_city_status
    ON properties (city, status)
    WHERE status = 'published'
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS idx_properties_city_status`);
}
```

> `CONCURRENTLY` cannot run inside a transaction. If your migration runner wraps statements in a transaction, execute index creation in a separate migration.

### 4.5 Data Migrations

Keep data migrations separate from schema migrations:

```typescript
// Schema migration: 1736000000000-AddPropertySlugColumn.ts
// Data migration:   1736000001000-BackfillPropertySlugs.ts

export class BackfillPropertySlugs1736000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Process in batches to avoid locking the table
    let offset = 0;
    const batchSize = 500;

    while (true) {
      const rows = await queryRunner.query(
        `SELECT id, title FROM properties WHERE slug IS NULL LIMIT $1 OFFSET $2`,
        [batchSize, offset],
      );

      if (rows.length === 0) break;

      for (const row of rows) {
        const slug = row.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        await queryRunner.query(
          `UPDATE properties SET slug = $1 WHERE id = $2`,
          [slug, row.id],
        );
      }

      offset += batchSize;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE properties SET slug = NULL`);
  }
}
```

---

## 5. Testing Migrations

### 5.1 Local Testing

```bash
# Start from a clean state
npm run migration:revert   # Revert last migration
npm run migration:show     # Confirm state

# Apply your migration
npm run migration:run

# Verify the schema
psql -d chioma_db -c "\d properties"   # Inspect table structure

# Test the down migration
npm run migration:revert
psql -d chioma_db -c "\d properties"   # Confirm rollback

# Re-apply
npm run migration:run
```

### 5.2 Integration Tests

Write an integration test that exercises the migrated schema:

```typescript
// backend/test/migrations/add-property-amenities.spec.ts
describe("AddPropertyAmenities migration", () => {
  it("should add amenities column to properties table", async () => {
    const result = await dataSource.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'properties' AND column_name = 'amenities'
    `);
    expect(result).toHaveLength(1);
    expect(result[0].data_type).toBe("jsonb");
  });
});
```

### 5.3 CI Pipeline Checks

Every pull request runs:

1. `npm run migration:run` on a fresh test database
2. Application unit and integration tests
3. `npm run migration:revert` followed by `npm run migration:run` (idempotency check)

---

## 6. Rollback Procedures

### 6.1 Revert the Last Migration

```bash
npm run migration:revert
```

This executes the `down()` method of the most recently applied migration.

### 6.2 Revert Multiple Migrations

```bash
# Revert 3 migrations
npm run migration:revert
npm run migration:revert
npm run migration:revert

# Check state
npm run migration:show
```

### 6.3 Production Rollback

> Always run a database backup before reverting in production.

```bash
# 1. Create a backup snapshot
pg_dump -Fc chioma_production > backup_$(date +%Y%m%d_%H%M%S).dump

# 2. Revert the migration
DATABASE_URL=$PROD_DATABASE_URL npm run migration:revert

# 3. Roll back the application code to the previous version
# (via your deployment tooling — Kubernetes rollout, ECS task revision, etc.)

# 4. Verify application health
curl https://api.chioma.app/health
```

### 6.4 Emergency Manual Rollback

If the TypeORM runner is unavailable, apply the `down` SQL manually:

```sql
-- Example: manually revert AddPropertyAmenities
ALTER TABLE properties DROP COLUMN IF EXISTS amenities;

-- Remove the migration record so TypeORM is back in sync
DELETE FROM migrations WHERE name = 'AddPropertyAmenities1736000000000';
```

---

## 7. Production Deployment

### 7.1 Pre-Deployment Checklist

- [ ] Migration has been reviewed by a second developer
- [ ] Migration tested on staging with production-sized data
- [ ] Database backup completed
- [ ] Rollback plan documented and tested on staging
- [ ] Application code is backward-compatible with both old and new schema
- [ ] Maintenance window scheduled if downtime is required

### 7.2 Deployment Order

**Always deploy the database migration before the application code:**

```
1. Deploy migration → database accepts both old and new schema
2. Deploy new application code → uses new schema
3. (Optional cleanup) Deploy migration to remove backward-compat shims
```

**Never deploy application code that requires a new column before the column exists.**

### 7.3 Running Migrations in Production

```bash
# Via CI/CD pipeline (recommended)
NODE_ENV=production DATABASE_URL=$PROD_DATABASE_URL npm run migration:run

# Or directly on the production server
ssh prod-server "cd /app/backend && npm run migration:run"
```

### 7.4 Post-Deployment Verification

```bash
# Confirm migrations ran
npm run migration:show

# Run health check
curl https://api.chioma.app/health/detailed

# Monitor error rates in Sentry for 10 minutes post-deploy
```

---

## 8. Zero-Downtime Strategies

### 8.1 Expand/Contract Pattern

The safest approach for any breaking schema change:

| Phase    | Action                                 | Risk                |
| -------- | -------------------------------------- | ------------------- |
| Expand   | Add new column/table alongside old     | None                |
| Migrate  | Copy data; update app to write to both | Low                 |
| Contract | Remove old column/table                | Low (old code gone) |

### 8.2 Non-Breaking Changes (Safe to Deploy Anytime)

- Adding a nullable column
- Adding a new table
- Adding an index (use `CONCURRENTLY`)
- Widening a `VARCHAR` length
- Adding a new enum value (PostgreSQL 12+)

### 8.3 Breaking Changes (Require Expand/Contract)

- Renaming a column or table
- Removing a column or table
- Changing a column type
- Adding a `NOT NULL` constraint to an existing column
- Narrowing a `VARCHAR` length

### 8.4 Blue/Green Deployment

For high-risk migrations, use a blue/green deployment:

1. Bring up the new (green) environment pointing to a migrated replica.
2. Run smoke tests against green.
3. Switch traffic from blue to green.
4. Keep blue running for rapid rollback.

---

## 9. Troubleshooting

### Migration stuck / deadlock

```sql
-- Find blocking queries
SELECT pid, query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle';

-- Terminate the blocker
SELECT pg_terminate_backend(<blocking_pid>);
```

### Migration applied twice

This usually means the `migrations` table entry was manually deleted. Check:

```sql
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;
```

Re-insert the record if the migration actually ran:

```sql
INSERT INTO migrations (timestamp, name) VALUES (1736000000000, 'AddPropertyAmenities1736000000000');
```

### Migration file not detected

- Ensure `migrations` path in `data-source.ts` matches the file location.
- Confirm the file exports a class that implements `MigrationInterface`.
- Run `npm run build` — TypeORM CLI reads compiled JS in `dist/`.

### Column already exists error

The migration ran partially. Wrap DDL in existence checks:

```sql
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]';
```

Or check in TypeScript:

```typescript
const table = await queryRunner.getTable('properties');
if (!table.findColumnByName('amenities')) {
  await queryRunner.addColumn('properties', new TableColumn({ ... }));
}
```

---

## 10. Examples

### Example 1: Add a Nullable Column

```typescript
export class AddStellarMemoToPayments1736100000000 implements MigrationInterface {
  name = "AddStellarMemoToPayments1736100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "payments",
      new TableColumn({
        name: "stellar_memo",
        type: "varchar",
        length: "28",
        isNullable: true,
        comment: "Stellar transaction memo for payment matching",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("payments", "stellar_memo");
  }
}
```

### Example 2: Add a Foreign Key

```typescript
export class AddAgentToProperties1736200000000 implements MigrationInterface {
  name = "AddAgentToProperties1736200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "properties",
      new TableColumn({
        name: "agent_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      "properties",
      new TableForeignKey({
        columnNames: ["agent_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("properties");
    const fk = table.foreignKeys.find((fk) =>
      fk.columnNames.includes("agent_id"),
    );
    if (fk) await queryRunner.dropForeignKey("properties", fk);
    await queryRunner.dropColumn("properties", "agent_id");
  }
}
```

### Example 3: Create a New Table

```typescript
export class CreateMaintenanceRequests1736300000000 implements MigrationInterface {
  name = "CreateMaintenanceRequests1736300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "maintenance_requests",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          { name: "property_id", type: "uuid", isNullable: false },
          { name: "tenant_id", type: "uuid", isNullable: false },
          { name: "description", type: "text", isNullable: false },
          { name: "status", type: "varchar", length: "20", default: "'open'" },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("maintenance_requests", true);
  }
}
```

---

## 11. Migration Checklist

### Before Writing

- [ ] Understand the full impact of the change (affected tables, indexes, constraints)
- [ ] Determine if the change is breaking or non-breaking
- [ ] Choose the correct strategy (direct, expand/contract, blue/green)

### While Writing

- [ ] Migration class name includes the timestamp
- [ ] Both `up()` and `down()` are implemented
- [ ] New `NOT NULL` columns have a default value for existing rows
- [ ] Large-table index creation uses `CONCURRENTLY`
- [ ] Data migrations use batching to avoid lock escalation
- [ ] Foreign key `onDelete` behavior is explicitly set

### Before Merging

- [ ] Ran `migration:run` locally against a clean schema
- [ ] Ran `migration:revert` and confirmed the rollback is clean
- [ ] Reviewed the generated SQL in `dist/` for correctness
- [ ] Peer-reviewed by a second developer
- [ ] CI pipeline passes (migration + tests)

### Before Production Deploy

- [ ] Tested on staging with production-sized data volume
- [ ] Database backup completed
- [ ] Rollback plan ready
- [ ] Monitoring dashboards open
- [ ] Application code is backward-compatible with pre-migration schema

---

## Related Documentation

- [Database Performance Optimization](database-performance-optimization.md)
- [Debugging Guide](debugging-guide.md)
- [Infrastructure as Code](infrastructure-as-code.md)
