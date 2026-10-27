# Disaster Recovery Plan

Covers backup and restore of production data, and the playbook for the three disaster scenarios we plan for: node failure, database corruption and data center (region) loss. Archival of old records is a separate concern — see `data-archival-implementation.md`.

## Targets

| Metric                             | Target         | Meaning                         |
| ---------------------------------- | -------------- | ------------------------------- |
| **RPO** (Recovery Point Objective) | **15 minutes** | Maximum acceptable data loss    |
| **RTO** (Recovery Time Objective)  | **4 hours**    | Maximum time to restore service |

On-chain state (Stellar) is the source of truth for escrow and payments; it is not lost with the database and can be used to reconcile after a restore.

**Owner:** Platform/infrastructure team. Targets must be reviewed and agreed by the engineering lead and product owner; review annually.

## Backup schedule & retention

Implemented by AWS Backup in `infrastructure/modules/backup` (self-hosted deployments: `backend/scripts/backup-db.sh` via cron).

| Backup                                  | Frequency                                  | Retention           |
| --------------------------------------- | ------------------------------------------ | ------------------- |
| PostgreSQL daily snapshot               | Daily (02:00 UTC)                          | 30 days             |
| PostgreSQL monthly snapshot             | Monthly (1st, 03:00 UTC)                   | 1 year              |
| PostgreSQL WAL / point-in-time recovery | Continuous (RDS automated backups)         | 7 days              |
| Cross-region copies (DR vault)          | With every daily and monthly snapshot      | Same as source      |
| Redis                                   | Not backed up (cache/queue; rebuildable)   | —                   |
| Uploaded files / object storage         | Versioned bucket, cross-region replication | 30 days of versions |

Backups are encrypted at rest (KMS) and copied to a vault in a separate region (`dr_region`, default `us-west-2`). Failed backup, copy and restore jobs notify the `chioma-<env>-backup-events` SNS topic.

## Restore testing

Restores are tested **weekly**, automatically:

- **AWS:** an AWS Backup restore testing plan restores the latest RDS recovery point every Sunday at 05:00 UTC, validates it becomes available, and deletes it. Results: AWS Backup console → Restore testing.
- **Self-hosted:** `backend/scripts/test-backup-restore.sh` restores the latest dump into a temporary database and checks the core tables (cron: `0 5 * * 0`).

Each quarter, an engineer also performs a full timed restore on staging (procedure below) and records it in the log at the end of this document.

## Restore procedure

1. **Declare** a DR incident (see `incident-response-runbooks.md`) and put the app in maintenance mode.
2. **Choose restore point**: latest snapshot + WAL replay to the target timestamp (just before the incident).
3. **Provision** a new database instance from the snapshot/PITR (do not overwrite the damaged instance — keep it for forensics).

   ```bash
   # Point-in-time restore (RDS)
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier chioma-production-postgres \
     --target-db-instance-identifier chioma-production-postgres-restore \
     --restore-time <ISO-8601 timestamp> \
     --db-subnet-group-name chioma-production-postgres

   # Manual restore from a pg_dump file
   createdb -h <new-host> -U <user> chioma_restore
   gunzip -c backup_<timestamp>.sql.gz | psql -h <new-host> -U <user> -d chioma_restore -v ON_ERROR_STOP=1
   ```

4. **Run migrations** to confirm schema is current: `cd backend && npm run migration:run`.
5. **Verify**: row counts on key tables (users, agreements, payments), app health check, smoke test login and a read-only payment query.
6. **Reconcile** payments and escrow against Stellar for the window between restore point and incident.
7. **Switch** `DATABASE_*` config to the restored instance, restart services, exit maintenance mode.
8. **Record** actual RPO/RTO achieved in the log below.

## Disaster recovery playbook

Every scenario starts the same way:

1. **Declare** the incident in `#incidents`, name an incident commander (IC) and a scribe. The IC owns decisions; everyone else executes.
2. **Assess** the blast radius with the dashboards and alerts (`docs/apm.md`, Prometheus/Grafana, AWS Health Dashboard).
3. **Communicate**: status page update within 15 minutes, then every 30 minutes until resolved.
4. **Close out** with the post-incident checklist in `incident-response-runbooks.md` and a log entry below.

Detailed command-level steps for each component live in `backend/docs/deployment/runbooks/DISASTER_RECOVERY_PROCEDURES.md`.

### Scenario 1: Node failure

A Kubernetes worker node, a database instance or a Redis node becomes unavailable.

**Detection:** `KubeNodeNotReady` / pods `Pending`, health check failures on `/health`, RDS or ElastiCache failover events, spike in `http_errors_total{status_class="5xx"}`.

**Expected impact:** none to brief (seconds to ~2 minutes). Built-in redundancy should handle it without a restore:

| Component    | Redundancy                                                                 | Automatic recovery                                      |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| Backend pods | 3+ replicas (HPA), pod anti-affinity across nodes, PDB `minAvailable: 2`   | Kubernetes reschedules pods on healthy nodes            |
| EKS nodes    | Managed node group spread across AZs                                       | Node group replaces the failed EC2 instance             |
| PostgreSQL   | RDS Multi-AZ synchronous standby                                           | RDS fails over to the standby (DNS endpoint unchanged)  |
| Redis        | Primary + replica, automatic failover                                      | ElastiCache promotes the replica                        |

**Actions:**

1. Confirm the failure is isolated: `kubectl get nodes`, `kubectl get pods -n production -o wide`, RDS/ElastiCache event logs.
2. Wait for automatic recovery (up to 10 minutes). Verify `kubectl rollout status deployment/chioma-backend -n production` and `/health`.
3. If a node stays `NotReady`: `kubectl cordon <node>` then `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data`, and terminate the instance so the node group replaces it.
4. If pods cannot be scheduled (insufficient capacity), raise the node group size: `aws eks update-nodegroup-config --cluster-name chioma-production --nodegroup-name chioma-production-default --scaling-config desiredSize=<n>`.
5. If the database did not fail over automatically: `aws rds reboot-db-instance --db-instance-identifier chioma-production-postgres --force-failover`.
6. After a DB or Redis failover, check for connection errors and failed queue jobs; retry dead-lettered jobs once the app is healthy.

**Escalate** to Scenario 3 if multiple nodes in more than one AZ fail at the same time.

### Scenario 2: Database corruption

Data is wrong or unreadable: a bad migration, a buggy deploy writing incorrect data, accidental `DELETE`/`UPDATE`, or storage-level corruption.

**Detection:** application errors referencing invalid data, failed integrity checks, user reports, unexpected row-count drops, `QueryFailedError` spikes.

**Expected impact:** degraded or read-only service; RTO ≤ 4 hours, RPO ≤ 15 minutes (PITR).

**Actions:**

1. **Stop the damage.** Enable maintenance mode and scale writers down so no further bad writes happen: `kubectl scale deployment/chioma-backend -n production --replicas=0`. Pause background workers and queues.
2. **Find the corruption point.** Use deploy and migration history (`npm run migration:show`), audit logs and the PostgreSQL logs to pin down the earliest bad write. Pick a restore time just before it.
3. **Decide the restore type:**
   - _Limited, well-understood damage_ (a few tables/rows): restore to a **new** instance at the chosen time and copy only the affected rows back.
   - _Widespread or unknown damage_: restore the whole database to a new instance and cut over.
   - _Storage-level corruption_: restore from the latest snapshot in the vault that passes `backend/scripts/verify-backup.sh`. If the latest fails, use the one before it.
4. **Restore** following the [Restore procedure](#restore-procedure). Never restore over the damaged instance; keep it for forensics until the post-mortem is closed.
5. **Revert the cause** (roll back the deploy or migration) **before** reconnecting the application.
6. **Reconcile** payments and escrow against Stellar for the window between restore point and incident; replay legitimate writes from the window if needed (audit log, webhook history).
7. **Resume**: point `DATABASE_*` at the restored instance, scale the backend back up, exit maintenance mode, watch error rates and DB query times for 1 hour.

### Scenario 3: Data center loss

The primary AWS region (or enough of its AZs) is unavailable for an extended period and is not expected back within the RTO.

**Detection:** AWS Health Dashboard regional event, all AZs failing health checks, primary region APIs unreachable.

**Expected impact:** full outage until failover. RTO ≤ 4 hours. RPO is the age of the latest cross-region snapshot copy (up to 24 hours for the database) unless PITR is still reachable; uploaded files are replicated continuously.

**Decision:** the IC, with the engineering lead, declares a regional failover if the region is not recovering 30 minutes after the AWS event started. Failing over too early risks split-brain writes, so wait for the decision.

**Actions:**

1. **Freeze** writes: enable maintenance mode on the edge/DNS (point the API record at the static maintenance page) so clients stop hitting the failed region.
2. **Rebuild infrastructure in the DR region** from git. Swap the regions in a new tfvars file and use a separate state key:

   ```bash
   cp infrastructure/environments/production.tfvars infrastructure/environments/production-dr.tfvars
   # In production-dr.tfvars set: aws_region = "us-west-2", dr_region = "us-east-1"
   sed 's#production/terraform.tfstate#production-dr/terraform.tfstate#' \
     infrastructure/environments/production.s3.tfbackend > infrastructure/environments/production-dr.s3.tfbackend

   terraform -chdir=infrastructure init -backend-config=environments/production-dr.s3.tfbackend -reconfigure
   terraform -chdir=infrastructure apply -var-file=environments/production-dr.tfvars
   ```

   If the state bucket's region is down too, create a state bucket in the DR region with `infrastructure/bootstrap` (`-var aws_region=us-west-2 -var state_bucket_name=chioma-terraform-state-dr`) and point the backend file at it.
3. **Restore the database** from the latest recovery point in the DR vault (`chioma-production-backup-dr`), using the subnet group and security group created in step 2:

   ```bash
   aws backup list-recovery-points-by-backup-vault --region us-west-2 \
     --backup-vault-name chioma-production-backup-dr
   aws backup start-restore-job --region us-west-2 \
     --recovery-point-arn <arn> --iam-role-arn <backup role arn> \
     --metadata file://restore-metadata.json
   ```

   Then run migrations and verify as in the [Restore procedure](#restore-procedure).
4. **Object storage:** use the replica bucket (`<assets bucket>-replica`) in the DR region; update the storage bucket/region config.
5. **Secrets:** recreate or replicate application secrets (JWT, encryption keys, Stellar keys, APM keys) in the DR region's Secrets Manager. Keep encryption keys identical or stored data cannot be decrypted.
6. **Deploy the application** to the new EKS cluster (`aws eks update-kubeconfig --region us-west-2 --name chioma-production`, then apply `backend/k8s/` and the current image tag).
7. **Reconcile** payments and escrow against Stellar for the whole window since the restored snapshot. On-chain data is unaffected by the regional outage.
8. **Cut over** DNS to the DR load balancer, exit maintenance mode, and monitor closely.
9. **Fail back** later as a planned change: once the primary region is healthy, rebuild it from Terraform, restore from a fresh DR snapshot during a maintenance window, and switch DNS back.

### Contacts & access

Keep these current; check them during each quarterly restore drill.

| Role                      | Who                        | Needs                                          |
| ------------------------- | -------------------------- | ---------------------------------------------- |
| Incident commander        | On-call engineering lead   | PagerDuty, status page admin                   |
| Infrastructure            | Platform on-call           | AWS admin role (both regions), Terraform state |
| Database                  | Backend on-call            | RDS / AWS Backup restore permissions           |
| Blockchain reconciliation | Contracts/payments owner   | Stellar Horizon access, payment admin tools    |
| Communications            | Product owner              | Status page, support channels                  |

## Restore test log

Automated weekly restore tests are recorded by AWS Backup. Record the quarterly timed drills and any real recoveries here.

| Date  | Environment | Scenario / backup used | DB size | Restore time | Total RTO | Performed by | Notes                       |
| ----- | ----------- | ---------------------- | ------- | ------------ | --------- | ------------ | --------------------------- |
| _TBD_ | staging     |                        |         |              |           |              | First timed restore pending |
