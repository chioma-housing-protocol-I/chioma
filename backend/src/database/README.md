# Data Management

Production-grade data management: migrations, seeding, consistency checks, backup and restore.

## Overview

| Component               | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| **Migration runner**    | Run migrations with automatic rollback on failure              |
| **Seed runner**         | Reference data seeding (currencies, etc.) for all environments |
| **Consistency checker** | Verify tables and migration state after deploy                 |
| **Backup / Restore**    | Scripts for PostgreSQL backup and restore                      |

## Runbooks

### Migrations

**Run migrations (with rollback on failure)**

```bash
pnpm run migration:run:safe
```

- Runs pending TypeORM migrations.
- If any migration fails, the last executed migration is reverted automatically.
- Post-run: verifies migrations table.

**Revert last migration**

```bash
pnpm run migration:revert
```

**Generate a new migration (after entity changes)**

```bash
pnpm run migration:generate -- src/migrations/YourMigrationName
```

### Seeding

**Reference data only (currencies, etc.) – all environments**

```bash
pnpm run seed:data
```

**User seeds (admin / agent / tenant)**

```bash
pnpm run seed:admin -- --email admin@example.com
pnpm run seed:agent
pnpm run seed:tenant
pnpm run seed:all   # admin + agent + tenant
```

- In production, user seeds require explicit `--force` where applicable.

### Data consistency

**Run after migrations or on a schedule**

```bash
pnpm run db:consistency
```

- Checks that critical tables exist and migrations table is present.
- Exit code 0 = all checks passed; 1 = one or more failed.

### Backup and restore

**Backup (direct PostgreSQL)**

```bash
# Load env (e.g. from .env) then:
./scripts/backup-db.sh
```

- Uses `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`.
- Optional: `BACKUP_DIR`, `RETENTION_DAYS`.

**Backup (Docker)**

```bash
USE_DOCKER=1 DOCKER_CONTAINER=chioma-postgres-production ./scripts/backup-db.sh
```

**Restore**

```bash
./scripts/db-restore.sh                          # from latest backup
./scripts/db-restore.sh /path/to/backup.sql.gz   # from file
```

- Same env vars for target database; `USE_DOCKER=1` for Docker.

## Success metrics

- **Migration success rate**: Use `migration:run:safe`; rollback on failure.
- **Backup**: Run `backup-db.sh` on a schedule; retain per `RETENTION_DAYS`.
- **Consistency**: Run `db:consistency` after each migration run and periodically.
- **Seeding**: Use `seed:data` for reference data; user seeds via existing commands.

## Configuration

- **DataSource**: `src/database/data-source.ts` (env: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`).
- **Migrations**: `src/migrations/*.ts`.
- **Seeds**: `src/database/seeds/`, `src/commands/*.seed.ts`.
