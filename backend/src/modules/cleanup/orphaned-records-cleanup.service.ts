import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

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
  deleted: boolean;
}

export interface OrphanedRecordsCleanupStats {
  checkedAt: string;
  deletionEnabled: boolean;
  results: OrphanCheckResult[];
  totalOrphaned: number;
  totalDeleted: number;
}

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
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async runScheduledCleanup(): Promise<void> {
    const stats = await this.runCleanup();
    this.logger.log(
      `Orphaned records cleanup completed: totalOrphaned=${stats.totalOrphaned}, totalDeleted=${stats.totalDeleted}, deletionEnabled=${stats.deletionEnabled}`,
    );
  }

  async runCleanup(): Promise<OrphanedRecordsCleanupStats> {
    const databaseType = String(this.dataSource.options.type);
    const deletionEnabled =
      this.configService.get<string>(
        'ORPHAN_CLEANUP_DELETE_ENABLED',
        'false',
      ) === 'true';

    const stats: OrphanedRecordsCleanupStats = {
      checkedAt: new Date().toISOString(),
      deletionEnabled,
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
        const result = await this.runCheck(check, deletionEnabled);
        stats.results.push(result);
        stats.totalOrphaned += result.orphanedCount;
        if (result.deleted) {
          stats.totalDeleted += result.orphanedCount;
        }
      } catch (error) {
        this.logger.warn(
          `Orphan check "${check.label}" failed: ${(error as Error).message}`,
        );
      }
    }

    return stats;
  }

  private async runCheck(
    check: OrphanCheck,
    deletionEnabled: boolean,
  ): Promise<OrphanCheckResult> {
    const parentColumn = check.parentColumn ?? 'id';

    const orphanIds: Array<{ id: string }> = await this.dataSource.query(
      `
        SELECT id FROM "${check.childTable}"
        WHERE "${check.childColumn}" IS NOT NULL
          AND "${check.childColumn}"::text NOT IN (
            SELECT "${parentColumn}"::text FROM "${check.parentTable}"
          )
      `,
    );

    const orphanedCount = orphanIds.length;

    if (orphanedCount === 0) {
      return {
        label: check.label,
        childTable: check.childTable,
        childColumn: check.childColumn,
        orphanedCount: 0,
        deleted: false,
      };
    }

    this.logger.warn(
      `Found ${orphanedCount} orphaned row(s) for ${check.label}`,
    );

    if (deletionEnabled) {
      await this.dataSource.query(
        `DELETE FROM "${check.childTable}" WHERE id = ANY($1::uuid[])`,
        [orphanIds.map((row) => row.id)],
      );
      this.logger.log(
        `Deleted ${orphanedCount} orphaned row(s) from "${check.childTable}" (${check.label})`,
      );
    }

    return {
      label: check.label,
      childTable: check.childTable,
      childColumn: check.childColumn,
      orphanedCount,
      deleted: deletionEnabled,
    };
  }
}
