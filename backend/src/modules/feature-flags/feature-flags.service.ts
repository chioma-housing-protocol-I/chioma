import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import {
  isFeatureEnabledForUser,
  calculateUserBucket,
} from './utils/bucketing.util';

/**
 * Default cache TTL. This is the documented window within which a flag
 * change made outside this process (another instance, direct DB edit) is
 * guaranteed to take effect. Same-process mutations invalidate immediately.
 */
export const DEFAULT_FEATURE_FLAG_CACHE_TTL_MS = 30_000;

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private cache: Map<string, FeatureFlag> = new Map();
  /** Epoch ms of the last cache load; 0 forces a load on first evaluation. */
  private cacheLoadedAt = 0;
  private readonly cacheTtlMs: number;

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepository: Repository<FeatureFlag>,
    @Optional() configService?: ConfigService,
  ) {
    const configured = Number(
      configService?.get(
        'FEATURE_FLAG_CACHE_TTL_MS',
        DEFAULT_FEATURE_FLAG_CACHE_TTL_MS,
      ) ?? DEFAULT_FEATURE_FLAG_CACHE_TTL_MS,
    );
    this.cacheTtlMs =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_FEATURE_FLAG_CACHE_TTL_MS;
  }

  async onModuleInit() {
    await this.refreshCache();
  }

  /**
   * Refreshes the in-memory flag cache from the database.
   *
   * The load timestamp advances even on failure so that a database outage
   * degrades to serving stale flags for one TTL window instead of retrying
   * the database on every evaluation.
   */
  async refreshCache(): Promise<void> {
    this.cacheLoadedAt = Date.now();
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

  private isCacheStale(): boolean {
    return Date.now() - this.cacheLoadedAt > this.cacheTtlMs;
  }

  /**
   * Evaluates whether a specific feature flag is enabled for a given user.
   *
   * In the steady state this is served entirely from the in-memory cache —
   * the database is only consulted when the cache has passed its TTL
   * (`FEATURE_FLAG_CACHE_TTL_MS`, default 30s). Unknown flags default to
   * disabled without a per-request database lookup.
   *
   * @param flagKey Unique key of the flag
   * @param userId Optional user identifier
   */
  async isFeatureEnabled(flagKey: string, userId?: string): Promise<boolean> {
    if (this.isCacheStale()) {
      await this.refreshCache();
    }

    const flag = this.cache.get(flagKey);
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
