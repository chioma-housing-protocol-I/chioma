# Backup Verification

Automated verification for PostgreSQL backups used in production readiness (#994).

## Script

`backend/scripts/verify-backup.sh`

| Mode               | Command                                               | Requires PostgreSQL |
| ------------------ | ----------------------------------------------------- | ------------------- |
| Metadata only      | `BACKUP_VERIFY_METADATA_ONLY=true make verify-backup` | No                  |
| Full restore drill | `make verify-backup`                                  | Yes                 |

### Metadata-only checks

- Latest `backup_*.sql.gz` exists under `BACKUP_DIR` (default `/var/backups/chioma`)
- File is readable and passes `gunzip -t`
- File size is at least 1 KB

### Full verification

1. Creates temporary database `chioma_verify_<timestamp>`
2. Restores the latest gzip SQL dump
3. Queries `SELECT COUNT(*) FROM "user"`
4. Drops the temporary database on exit

## Environment variables

| Variable                      | Default               | Description                       |
| ----------------------------- | --------------------- | --------------------------------- |
| `BACKUP_DIR`                  | `/var/backups/chioma` | Directory containing backup files |
| `BACKUP_VERIFY_METADATA_ONLY` | `false`               | Skip restore when `true`          |
| `DB_HOST`                     | `localhost`           | PostgreSQL host                   |
| `DB_PORT`                     | `5432`                | PostgreSQL port                   |
| `DB_USERNAME`                 | `postgres`            | PostgreSQL user                   |
| `DB_PASSWORD`                 | —                     | PostgreSQL password               |

## Scheduling

Run metadata verification daily in CI or cron. Run full restore verification weekly in staging.

See [BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md) for backup creation and retention policies.
