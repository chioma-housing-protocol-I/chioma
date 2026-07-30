import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import {
  isFeatureEnabledForUser,
  calculateUserBucket,
} from './utils/bucketing.util';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private cache: Map<string, FeatureFlag> = new Map();

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepository: Repository<FeatureFlag>,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  /**
   * Refreshes the in-memory flag cache from the database.
   */
  async refreshCache(): Promise<void> {
    try {
      const flags = await this.flagRepository.find();
      const newCache = new Map<string, FeatureFlag>();
      for (const flag of flags) {
        newCache.set(flag.key, flag);
      }
      this.cache = newCache;
      this.logger.log(
        `Feature flags cache refreshed. Loaded ${flags.length} flags.`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to prime feature flag cache from DB: ${err.message}`,
      );
    }
  }

  /**
   * Evaluates whether a specific feature flag is enabled for a given user.
   *
   * @param flagKey Unique key of the flag
   * @param userId Optional user identifier
   */
  async isFeatureEnabled(flagKey: string, userId?: string): Promise<boolean> {
    let flag = this.cache.get(flagKey);

    if (!flag) {
      flag = await this.flagRepository.findOne({ where: { key: flagKey } });
      if (flag) {
        this.cache.set(flag.key, flag);
      }
    }

    if (!flag) {
      // Unknown flags default to disabled for safety
      return false;
    }

    return isFeatureEnabledForUser(flag, userId);
  }

  /**
   * Evaluates all flags in the system for a given user identifier.
   */
  async evaluateAllFlagsForUser(userId?: string): Promise<
    Record<
      string,
      {
        enabled: boolean;
        rolloutPercentage: number;
        isEnabledForUser: boolean;
        bucket?: number;
      }
    >
  > {
    await this.refreshCache();
    const result: Record<
      string,
      {
        enabled: boolean;
        rolloutPercentage: number;
        isEnabledForUser: boolean;
        bucket?: number;
      }
    > = {};

    for (const [key, flag] of this.cache.entries()) {
      const isEnabled = isFeatureEnabledForUser(flag, userId);
      const userBucket = userId ? calculateUserBucket(userId, key) : undefined;

      result[key] = {
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        isEnabledForUser: isEnabled,
        bucket: userBucket,
      };
    }

    return result;
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return this.flagRepository.find({ order: { key: 'ASC' } });
  }

  async getFlagByKey(key: string): Promise<FeatureFlag> {
    const flag = await this.flagRepository.findOne({ where: { key } });
    if (!flag) {
      throw new NotFoundException(`Feature flag with key '${key}' not found`);
    }
    return flag;
  }

  async createFlag(dto: CreateFeatureFlagDto): Promise<FeatureFlag> {
    const existing = await this.flagRepository.findOne({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException(
        `Feature flag with key '${dto.key}' already exists`,
      );
    }

    const flag = this.flagRepository.create({
      key: dto.key,
      description: dto.description,
      enabled: dto.enabled ?? true,
      rolloutPercentage: dto.rolloutPercentage ?? 100,
      metadata: dto.metadata,
    });

    const saved = await this.flagRepository.save(flag);
    this.cache.set(saved.key, saved);
    this.logger.log(
      `Created feature flag '${saved.key}' with rollout ${saved.rolloutPercentage}%`,
    );
    return saved;
  }

  async updateFlag(
    key: string,
    dto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlag> {
    const flag = await this.getFlagByKey(key);

    if (dto.description !== undefined) {
      flag.description = dto.description;
    }
    if (dto.enabled !== undefined) {
      flag.enabled = dto.enabled;
    }
    if (dto.rolloutPercentage !== undefined) {
      flag.rolloutPercentage = dto.rolloutPercentage;
    }
    if (dto.metadata !== undefined) {
      flag.metadata = dto.metadata;
    }

    const saved = await this.flagRepository.save(flag);
    this.cache.set(saved.key, saved);
    this.logger.log(
      `Updated feature flag '${saved.key}' (enabled: ${saved.enabled}, rollout: ${saved.rolloutPercentage}%)`,
    );
    return saved;
  }

  async setRolloutPercentage(
    key: string,
    percentage: number,
  ): Promise<FeatureFlag> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
    return this.updateFlag(key, { rolloutPercentage: percentage });
  }

  /**
   * Immediate kill switch for a feature flag. Disables the flag immediately.
   */
  async killSwitch(key: string): Promise<FeatureFlag> {
    this.logger.warn(`KILL SWITCH ACTIVATED for feature flag '${key}'`);
    return this.updateFlag(key, { enabled: false, rolloutPercentage: 0 });
  }

  async deleteFlag(key: string): Promise<void> {
    const flag = await this.getFlagByKey(key);
    await this.flagRepository.remove(flag);
    this.cache.delete(key);
    this.logger.log(`Deleted feature flag '${key}'`);
  }
}
