import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AlertService } from '../monitoring/alert.service';

interface OrphanCheck {
  label: string;
  childTable: string;
  childColumn: string;
  parentTable: string;
  parentColumn?: string;
}

export interface OrphanCheckResult {
  label: string;
  childTable: string;
  childColumn: string;
  orphanedCount: number;
  /** Up to [`SAMPLE_ID_LIMIT`] candidate row ids, for review before deletion. */
  sampleIds: string[];
  deleted: boolean;
}

export interface OrphanedRecordsCleanupStats {
  checkedAt: string;
  deletionEnabled: boolean;
  /** True when this run only reported candidates without mutating. */
  dryRun: boolean;
  /** Per-run deletion ceiling in effect. */
  maxDeletionsPerRun: number;
  /** True when the run stopped early because the cap would be exceeded. */
  aborted: boolean;
  abortReason?: string;
  results: OrphanCheckResult[];
  totalOrphaned: number;
  totalDeleted: number;
}

/** Default per-run deletion ceiling; configurable via env. */
export const DEFAULT_MAX_DELETIONS_PER_RUN = 500;
/** How many candidate ids each check reports for inspection. */
export const SAMPLE_ID_LIMIT = 10;

/**
 * These child tables reference a parent (users/properties/bookings/
 * rent_agreements/payments) by a plain column with no DB-level foreign key
 * or ON DELETE behavior, so deleting the parent leaves the child row behind
 * forever. This service periodically finds (and, once enabled, removes)
 * those orphaned rows so they don't accumulate indefinitely.
 */
const ORPHAN_CHECKS: OrphanCheck[] = [
  {
    label: 'documents.property_id -> properties',
    childTable: 'documents',
    childColumn: 'property_id',
    parentTable: 'properties',
  },
  {
    label: 'documents.tenant_id -> users',
    childTable: 'documents',
    childColumn: 'tenant_id',
    parentTable: 'users',
  },
  {
    label: 'documents.owner_id -> users',
    childTable: 'documents',
    childColumn: 'owner_id',
    parentTable: 'users',
  },
  {
    label: 'kyc.user_id -> users',
    childTable: 'kyc',
    childColumn: 'user_id',
    parentTable: 'users',
  },
  {
    label: 'reviews.reviewer_id -> users',
    childTable: 'reviews',
    childColumn: 'reviewer_id',
    parentTable: 'users',
  },
  {
    label: 'reviews.reviewee_id -> users',
    childTable: 'reviews',
    childColumn: 'reviewee_id',
    parentTable: 'users',
  },
  {
    label: 'reviews.property_id -> properties',
    childTable: 'reviews',
    childColumn: 'property_id',
    parentTable: 'properties',
  },
  {
    label: 'oauth_accounts.user_id -> users',
    childTable: 'oauth_accounts',
    childColumn: 'user_id',
    parentTable: 'users',
  },
  {
    label: 'api_keys.user_id -> users',
    childTable: 'api_keys',
    childColumn: 'user_id',
    parentTable: 'users',
  },
  {
    label: 'feedback.user_id -> users',
    childTable: 'feedback',
    childColumn: 'user_id',
    parentTable: 'users',
  },
  {
    label: 'guest_reviews.booking_id -> bookings',
    childTable: 'guest_reviews',
    childColumn: 'booking_id',
    parentTable: 'bookings',
  },
  {
    label: 'guest_reviews.guest_id -> users',
    childTable: 'guest_reviews',
    childColumn: 'guest_id',
    parentTable: 'users',
  },
  {
    label: 'guest_reviews.host_id -> users',
    childTable: 'guest_reviews',
    childColumn: 'host_id',
    parentTable: 'users',
  },
  {
    label: 'host_reviews.booking_id -> bookings',
    childTable: 'host_reviews',
    childColumn: 'booking_id',
    parentTable: 'bookings',
  },
  {
    label: 'host_reviews.guest_id -> users',
    childTable: 'host_reviews',
    childColumn: 'guest_id',
    parentTable: 'users',
  },
  {
    label: 'host_reviews.host_id -> users',
    childTable: 'host_reviews',
    childColumn: 'host_id',
    parentTable: 'users',
  },
  {
    label: 'property_inquiries.property_id -> properties',
    childTable: 'property_inquiries',
    childColumn: 'property_id',
    parentTable: 'properties',
  },
  {
    label: 'property_inquiries.from_user_id -> users',
    childTable: 'property_inquiries',
    childColumn: 'from_user_id',
    parentTable: 'users',
  },
  {
    label: 'property_inquiries.to_user_id -> users',
    childTable: 'property_inquiries',
    childColumn: 'to_user_id',
    parentTable: 'users',
  },
  {
    label: 'sublet_requests.agreement_id -> rent_agreements',
    childTable: 'sublet_requests',
    childColumn: 'agreement_id',
    parentTable: 'rent_agreements',
  },
  {
    label: 'sublet_requests.tenant_id -> users',
    childTable: 'sublet_requests',
    childColumn: 'tenant_id',
    parentTable: 'users',
  },
  {
    label: 'sublet_requests.landlord_id -> users',
    childTable: 'sublet_requests',
    childColumn: 'landlord_id',
    parentTable: 'users',
  },
  {
    label: 'sublet_bookings.booking_id -> bookings',
    childTable: 'sublet_bookings',
    childColumn: 'booking_id',
    parentTable: 'bookings',
  },
  {
    label: 'sublet_bookings.agreement_id -> rent_agreements',
    childTable: 'sublet_bookings',
    childColumn: 'agreement_id',
    parentTable: 'rent_agreements',
  },
  {
    label: 'sublet_bookings.tenant_id -> users',
    childTable: 'sublet_bookings',
    childColumn: 'tenant_id',
    parentTable: 'users',
  },
  {
    label: 'sublet_bookings.landlord_id -> users',
    childTable: 'sublet_bookings',
    childColumn: 'landlord_id',
    parentTable: 'users',
  },
  {
    label: 'sublet_bookings.guest_id -> users',
    childTable: 'sublet_bookings',
    childColumn: 'guest_id',
    parentTable: 'users',
  },
  {
    label: 'indexed_transactions.agreement_id -> rent_agreements',
    childTable: 'indexed_transactions',
    childColumn: 'agreement_id',
    parentTable: 'rent_agreements',
  },
  {
    label: 'indexed_transactions.property_id -> properties',
    childTable: 'indexed_transactions',
    childColumn: 'property_id',
    parentTable: 'properties',
  },
  {
    label: 'indexed_transactions.payment_id -> payments',
    childTable: 'indexed_transactions',
    childColumn: 'payment_id',
    parentTable: 'payments',
  },
];

@Injectable()
export class OrphanedRecordsCleanupService {
  private readonly logger = new Logger(OrphanedRecordsCleanupService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @Optional() private readonly alertService?: AlertService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async runScheduledCleanup(): Promise<void> {
    const stats = await this.runCleanup();
    this.logger.log(
      `Orphaned records cleanup completed: totalOrphaned=${stats.totalOrphaned}, totalDeleted=${stats.totalDeleted}, deletionEnabled=${stats.deletionEnabled}, dryRun=${stats.dryRun}, aborted=${stats.aborted}`,
    );
  }

  /**
   * Scan (and optionally delete) orphaned rows.
   *
   * - `dryRun` (explicit option, or `ORPHAN_CLEANUP_DRY_RUN=true`) reports
   *   candidate counts and sample ids without mutating anything, regardless
   *   of `ORPHAN_CLEANUP_DELETE_ENABLED`.
   * - Deletions are capped per run by `ORPHAN_CLEANUP_MAX_DELETIONS_PER_RUN`
   *   (default 500): the run aborts before any batch that would push the
   *   total over the cap and raises a critical alert, so a bad predicate
   *   cannot silently remove a large amount of data in one pass.
   */
  async runCleanup(options?: {
    dryRun?: boolean;
  }): Promise<OrphanedRecordsCleanupStats> {
    const databaseType = String(this.dataSource.options.type);
    const deletionEnabled =
      this.configService.get<string>(
        'ORPHAN_CLEANUP_DELETE_ENABLED',
        'false',
      ) === 'true';
    const dryRun =
      options?.dryRun ??
      this.configService.get<string>('ORPHAN_CLEANUP_DRY_RUN', 'false') ===
        'true';
    const maxDeletionsPerRun = this.getMaxDeletionsPerRun();

    const stats: OrphanedRecordsCleanupStats = {
      checkedAt: new Date().toISOString(),
      deletionEnabled,
      dryRun,
      maxDeletionsPerRun,
      aborted: false,
      results: [],
      totalOrphaned: 0,
      totalDeleted: 0,
    };

    if (databaseType !== 'postgres') {
      this.logger.debug(
        `Skipping orphaned records cleanup for ${databaseType} database`,
      );
      return stats;
    }

    for (const check of ORPHAN_CHECKS) {
      try {
        const orphanIds = await this.findOrphanIds(check);
        const orphanedCount = orphanIds.length;
        const result: OrphanCheckResult = {
          label: check.label,
          childTable: check.childTable,
          childColumn: check.childColumn,
          orphanedCount,
          sampleIds: orphanIds.slice(0, SAMPLE_ID_LIMIT),
          deleted: false,
        };
        stats.results.push(result);
        stats.totalOrphaned += orphanedCount;

        if (orphanedCount === 0) {
          continue;
        }

        this.logger.warn(
          `Found ${orphanedCount} orphaned row(s) for ${check.label}`,
        );

        if (dryRun) {
          this.logger.log(
            `[DRY RUN] Would delete ${orphanedCount} row(s) from "${check.childTable}" (${check.label}); sample ids: ${result.sampleIds.join(', ')}`,
          );
          continue;
        }

        if (!deletionEnabled) {
          continue;
        }

        if (stats.totalDeleted + orphanedCount > maxDeletionsPerRun) {
          stats.aborted = true;
          stats.abortReason = `Deleting ${orphanedCount} row(s) for "${check.label}" would exceed the per-run cap of ${maxDeletionsPerRun} (already deleted ${stats.totalDeleted}). Run aborted before this batch.`;
          this.logger.error(stats.abortReason);
          await this.raiseCapExceededAlert(stats, check.label, orphanedCount);
          break;
        }

        await this.dataSource.query(
          `DELETE FROM "${check.childTable}" WHERE id = ANY($1::uuid[])`,
          [orphanIds],
        );
        result.deleted = true;
        stats.totalDeleted += orphanedCount;
        this.logger.log(
          `Deleted ${orphanedCount} orphaned row(s) from "${check.childTable}" (${check.label})`,
        );
      } catch (error) {
        this.logger.warn(
          `Orphan check "${check.label}" failed: ${(error as Error).message}`,
        );
      }
    }

    return stats;
  }

  private async findOrphanIds(check: OrphanCheck): Promise<string[]> {
    const parentColumn = check.parentColumn ?? 'id';
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `
        SELECT id FROM "${check.childTable}"
        WHERE "${check.childColumn}" IS NOT NULL
          AND "${check.childColumn}"::text NOT IN (
            SELECT "${parentColumn}"::text FROM "${check.parentTable}"
          )
      `,
    );
    return rows.map((row) => row.id);
  }

  private getMaxDeletionsPerRun(): number {
    const configured = Number(
      this.configService.get(
        'ORPHAN_CLEANUP_MAX_DELETIONS_PER_RUN',
        DEFAULT_MAX_DELETIONS_PER_RUN,
      ),
    );
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_MAX_DELETIONS_PER_RUN;
  }

  private async raiseCapExceededAlert(
    stats: OrphanedRecordsCleanupStats,
    checkLabel: string,
    batchSize: number,
  ): Promise<void> {
    try {
      await this.alertService?.handleAlert({
        alerts: [
          {
            status: 'firing',
            labels: {
              alertname: 'OrphanCleanupCapExceeded',
              severity: 'critical',
            },
            annotations: {
              summary: 'Orphaned records cleanup aborted at deletion cap',
              description: `Check "${checkLabel}" produced ${batchSize} candidate deletions; with ${stats.totalDeleted} already deleted this run, the cap of ${stats.maxDeletionsPerRun} would be exceeded. The run aborted without deleting the batch — review the candidate set (a bad predicate may be selecting far too many rows).`,
            },
            startsAt: stats.checkedAt,
            generatorURL: '',
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        'Failed to dispatch OrphanCleanupCapExceeded alert',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
