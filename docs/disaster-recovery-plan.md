# Disaster Recovery Plan

Covers backup and restore of production data. Archival of old records is a separate concern — see `data-archival-implementation.md`.

## Targets

| Metric                             | Target         | Meaning                         |
| ---------------------------------- | -------------- | ------------------------------- |
| **RPO** (Recovery Point Objective) | **15 minutes** | Maximum acceptable data loss    |
| **RTO** (Recovery Time Objective)  | **4 hours**    | Maximum time to restore service |

On-chain state (Stellar) is the source of truth for escrow and payments; it is not lost with the database and can be used to reconcile after a restore.

**Owner:** Platform/infrastructure team. Targets must be reviewed and agreed by the engineering lead and product owner; review annually.

## Backup schedule & retention

| Backup                                  | Frequency                                  | Retention           |
| --------------------------------------- | ------------------------------------------ | ------------------- |
| PostgreSQL full snapshot                | Daily (02:00 UTC)                          | 30 days             |
| PostgreSQL WAL / point-in-time recovery | Continuous (archived ≤ 5 min)              | 7 days              |
| Weekly snapshot                         | Weekly                                     | 12 weeks            |
| Monthly snapshot                        | Monthly                                    | 12 months           |
| Redis                                   | Not backed up (cache/queue; rebuildable)   | —                   |
| Uploaded files / object storage         | Versioned bucket, cross-region replication | 30 days of versions |

Backups are encrypted at rest and stored in a separate region/account from production.

## Restore procedure

1. **Declare** a DR incident (see `incident-response-runbooks.md`) and put the app in maintenance mode.
2. **Choose restore point**: latest snapshot + WAL replay to the target timestamp (just before the incident).
3. **Provision** a new database instance from the snapshot/PITR (do not overwrite the damaged instance — keep it for forensics).
   ```bash
   # Manual restore from a pg_dump file
   createdb -h <new-host> -U <user> chioma_restore
   pg_restore -h <new-host> -U <user> -d chioma_restore --jobs=4 backup.dump
   ```
4. **Run migrations** to confirm schema is current: `cd backend && npm run migration:run`.
5. **Verify**: row counts on key tables (users, agreements, payments), app health check, smoke test login and a read-only payment query.
6. **Reconcile** payments and escrow against Stellar for the window between restore point and incident.
7. **Switch** `DATABASE_*` config to the restored instance, restart services, exit maintenance mode.
8. **Record** actual RPO/RTO achieved in the log below.

## Restore test log

Restores must be tested at least quarterly on a staging environment.

| Date  | Environment | Backup used | DB size | Restore time | Total RTO | Performed by | Notes                       |
| ----- | ----------- | ----------- | ------- | ------------ | --------- | ------------ | --------------------------- |
| _TBD_ | staging     |             |         |              |           |              | First timed restore pending |
