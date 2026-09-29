import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudThresholds } from './entities/fraud-thresholds.entity';
import { UpdateFraudThresholdsDto } from './dto/update-fraud-thresholds.dto';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditLevel,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import {
  DEFAULT_FRAUD_THRESHOLDS,
  FRAUD_THRESHOLDS_DEFAULT_KEY,
  isValidThresholdPair,
} from './fraud-thresholds.defaults';

export interface FraudThresholdValues {
  thresholdReview: number;
  thresholdBlock: number;
}

/**
 * Runtime-configurable fraud scoring thresholds. Replaces the values that
 * used to be hardcoded (or baked into a static model-artifact file) in
 * FraudModelService, so operators can retune them in response to observed
 * abuse without a redeploy. Cached in memory (mirroring
 * FeatureFlagsService's pattern) and re-read from the DB on every update.
 */
@Injectable()
export class FraudThresholdsService implements OnModuleInit {
  private readonly logger = new Logger(FraudThresholdsService.name);
  private cached: FraudThresholdValues = { ...DEFAULT_FRAUD_THRESHOLDS };

  constructor(
    @InjectRepository(FraudThresholds)
    private readonly repository: Repository<FraudThresholds>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    try {
      const row = await this.getOrSeedRow();
      this.cached = {
        thresholdReview: row.thresholdReview,
        thresholdBlock: row.thresholdBlock,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to load fraud thresholds from DB; using safe defaults. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.cached = { ...DEFAULT_FRAUD_THRESHOLDS };
    }
  }

  /**
   * Synchronous read of the cached thresholds, for use in the hot scoring
   * path (FraudModelService.score) without adding a DB round-trip per call.
   */
  getThresholds(): FraudThresholdValues {
    return this.cached;
  }

  async updateThresholds(
    dto: UpdateFraudThresholdsDto,
    adminId: string,
  ): Promise<FraudThresholdValues> {
    const row = await this.getOrSeedRow();

    const nextThresholdReview = dto.thresholdReview ?? row.thresholdReview;
    const nextThresholdBlock = dto.thresholdBlock ?? row.thresholdBlock;

    if (!isValidThresholdPair(nextThresholdReview, nextThresholdBlock)) {
      throw new BadRequestException(
        'thresholdReview and thresholdBlock must each be between 0 and 100, with thresholdReview < thresholdBlock',
      );
    }

    const previous = {
      thresholdReview: row.thresholdReview,
      thresholdBlock: row.thresholdBlock,
    };

    row.thresholdReview = nextThresholdReview;
    row.thresholdBlock = nextThresholdBlock;
    const saved = await this.repository.save(row);

    this.cached = {
      thresholdReview: saved.thresholdReview,
      thresholdBlock: saved.thresholdBlock,
    };

    await this.auditService.log({
      action: AuditAction.FRAUD_THRESHOLDS_UPDATED,
      entityType: 'FraudThresholds',
      entityId: saved.id,
      performedBy: adminId,
      status: AuditStatus.SUCCESS,
      level: AuditLevel.SECURITY,
      oldValues: previous,
      newValues: this.cached,
    });

    this.logger.log(
      `Fraud thresholds updated by ${adminId}: review=${this.cached.thresholdReview}, block=${this.cached.thresholdBlock}`,
    );

    return this.cached;
  }

  private async getOrSeedRow(): Promise<FraudThresholds> {
    const existing = await this.repository.findOne({
      where: { key: FRAUD_THRESHOLDS_DEFAULT_KEY },
    });
    if (existing) {
      return existing;
    }

    const seeded = this.repository.create({
      key: FRAUD_THRESHOLDS_DEFAULT_KEY,
      ...DEFAULT_FRAUD_THRESHOLDS,
    });
    return this.repository.save(seeded);
  }
}
