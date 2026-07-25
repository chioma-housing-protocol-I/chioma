# Database Migration Runbook

**Project:** Chioma Platform  
**Version:** 1.0  
**Last Updated:** April 2026  
**Owner:** Backend Team  
**Classification:** Internal — Confidential

---

## Purpose

This runbook provides step-by-step procedures for safely creating, testing, and applying database migrations in the Chioma platform. Use this whenever you need to modify the database schema.

For detailed reference, see [DATABASE_DOCUMENTATION_GUIDE.md](../../database/DATABASE_DOCUMENTATION_GUIDE.md).

---

## Migration Safety Principles

1. **Every migration must be reversible** — always implement both `up` and `down` methods.
2. **Test rollback before production** — verify the down method works on a staging copy of production data.
3. **Never modify a committed migration** — create a new migration to correct issues.
4. **Keep migrations small and focused** — one logical change per migration.
5. **Avoid long-running locks** — use `CONCURRENTLY` for index creation on large tables.
6. **Review migration order** — migrations run sequentially by timestamp prefix.

---

## Creating a Migration

### Using TypeORM CLI

```bash
cd backend

# Generate migration from entity changes
pnpm run migration:generate -- src/migrations/MigrationName

# Create an empty migration
pnpm run typeorm migration:create -- src/migrations/MigrationName
```

### Migration Naming Convention

Migrations are prefixed with a Unix timestamp for ordering:

```
1740500000000-MigrationName.ts
```

Naming rules:

- Use PascalCase for the migration class name.
- Use descriptive names that explain the change (e.g., `AddPerformanceIndexes`, `CreateAuditLogsTable`).
- Keep the generated timestamp prefix — do not rename it.

### Migration Template

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName implements MigrationInterface {
  name = 'MigrationName';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Apply changes
    await queryRunner.query(`
      CREATE TABLE "new_table" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_new_table" PRIMARY KEY ("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes
    await queryRunner.query(`DROP TABLE "new_table";`);
  }
}
```

---

## Migration Workflow

### Step 1: Create the Migration

```bash
cd backend

# Generate migration from entity files
pnpm run migration:generate -- src/migrations/AddUserPreferencesTable

# Review generated migration file
cat src/migrations/1740500000000-AddUserPreferencesTable.ts
```

### Step 2: Review Migration SQL

Always review the generated migration before running it:

- Check that all columns have the expected types and constraints.
- Verify foreign key references point to the correct tables.
- Confirm indexes are created where needed.
- Check for any unintended table drops or column renames.
- Validate that the `down` method correctly reverses the `up` method.

### Step 3: Test Locally

```bash
# Start local database
docker compose up -d

# Run all pending migrations
pnpm run migration:run

# Verify migration was applied
pnpm run migration:show

# Check the data
# Run application and verify the change works

# Rollback and re-apply to test reversibility
pnpm run migration:revert
pnpm run migration:show  # Confirm reverted
pnpm run migration:run   # Re-apply
pnpm run migration:show  # Confirm re-applied
```

### Step 4: Verify Rollback

```bash
# Test full rollback chain
pnpm run migration:verify-rollback

# For complex migrations, test with realistic data:
# 1. Restore a staging backup to local
# 2. Run the migration
# 3. Verify application works
# 4. Rollback
# 5. Verify application works again
```

### Step 5: Run on Staging

```bash
# Deploy to staging first
pnpm run migration:run:safe

# Verify in staging:
# 1. Application health
# 2. API responses
# 3. Background jobs
# 4. No errors in logs

# Confirm rollback still works on staging
pnpm run migration:revert:safe
pnpm run migration:run:safe
```

### Step 6: Run on Production

```bash
# Pre-deployment backup
bash scripts/backup-db.sh

# Apply migration
pnpm run migration:run:safe

# Verify immediately:
# 1. Application health
curl -f https://api.chioma.io/health

# 2. Database connectivity
curl -s https://api.chioma.io/health/detailed | jq '.database'

# 3. No migration errors
pnpm run migration:show

# 4. Error rates normal
# Check Grafana or Sentry
```

---

## Migration Commands

| Command                              | Description                                     | Safe for Production |
| ------------------------------------ | ----------------------------------------------- | ------------------- |
| `pnpm run migration:show`            | Show all migrations and their status            | Yes                 |
| `pnpm run migration:run`             | Apply all pending migrations                    | Yes (cautious)      |
| `pnpm run migration:run:safe`        | Apply migrations with verification              | Yes                 |
| `pnpm run migration:revert`          | Roll back the last migration                    | Yes (cautious)      |
| `pnpm run migration:revert:safe`     | Roll back with verification                     | Yes                 |
| `pnpm run migration:verify-rollback` | Test that rollback works for pending migrations | No (staging only)   |
| `pnpm run migration:generate`        | Generate migration from entity changes          | N/A                 |

---

## High-Risk Migration Patterns

### Adding a NOT NULL Column to an Existing Table

```typescript
// Step 1: Add the column as nullable
await queryRunner.query(`
  ALTER TABLE "users" ADD "display_name" character varying;
`);

// Step 2: Backfill data
await queryRunner.query(`
  UPDATE "users" SET "display_name" = "email" WHERE "display_name" IS NULL;
`);

// Step 3: Add NOT NULL constraint
await queryRunner.query(`
  ALTER TABLE "users" ALTER COLUMN "display_name" SET NOT NULL;
`);
```

### Creating an Index on a Large Table

```typescript
// Use CONCURRENTLY to avoid locks
await queryRunner.query(`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_users_display_name"
  ON "users" ("display_name");
`);
```

Note: `CREATE INDEX CONCURRENTLY` cannot be run inside a transaction. You may need to run it outside the migration transaction or use `queryRunner.commitTransaction()` / `queryRunner.startTransaction()`.

### Renaming a Column

```typescript
// 1. Add the new column
await queryRunner.query(`
  ALTER TABLE "users" ADD "new_column_name" character varying;
`);

// 2. Copy data from old column to new
await queryRunner.query(`
  UPDATE "users" SET "new_column_name" = "old_column_name";
`);

// 3. Update application code to read from both columns
// 4. Deploy updated application

// 5. Drop the old column (in a subsequent migration)
await queryRunner.query(`
  ALTER TABLE "users" DROP COLUMN "old_column_name";
`);
```

---

## Migration Failure Recovery

### Symptom: Migration fails partway through

```bash
# 1. Check which migrations have been applied
pnpm run migration:show

# 2. If the failed migration is partially applied:
#    - Apply the down method manually if available
#    - Or restore from backup

# 3. Fix the migration script
# 4. Re-run migrations
pnpm run migration:run
```

### Symptom: Application cannot start after migration

```bash
# 1. Check migration status
pnpm run migration:show

# 2. Rollback the last migration
pnpm run migration:revert

# 3. Verify application starts again
pnpm run start:dev

# 4. Debug the migration issue
# 5. Re-apply after fixing
```

### Symptom: Data integrity issue after migration

```bash
# 1. Stop writes to affected tables
# 2. Assess data damage
psql -U chioma -c "SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM affected_table;"

# 3. Decide on recovery path:
#    - Rollback migration if safe
#    - Restore affected data from backup
#    - Manually fix corrupted records

# 4. Document the incident
```

---

## Migration Code Review Checklist

- [ ] Migration has a valid `up` method
- [ ] Migration has a valid `down` method that reverses `up` completely
- [ ] No irreversible operations (e.g., `DROP COLUMN` without backup)
- [ ] Indexes use `CONCURRENTLY` for large tables
- [ ] NOT NULL columns are backfilled before adding constraint
- [ ] Foreign keys reference existing tables and columns
- [ ] No hardcoded environment-specific values
- [ ] Migration has been tested locally with rollback
- [ ] Migration has been tested on staging
- [ ] Application code changes are compatible with both old and new schema (for zero-downtime deploys)

---

## Related Documentation

- [Database Documentation Guide](../../database/DATABASE_DOCUMENTATION_GUIDE.md)
- [Database Schema and Relationships](../../database/SCHEMA_RELATIONSHIPS.md)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Database Recovery Runbook](./RECOVERY_RUNBOOK.md)
- [Deployment Guide](../DEPLOYMENT.md)
