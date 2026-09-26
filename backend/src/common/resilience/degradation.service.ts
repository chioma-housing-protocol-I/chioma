import { Injectable, Logger } from '@nestjs/common';
import {
  DegradationLevel,
  DegradationStatus,
  FeaturePriority,
  FeatureStatus,
} from './resilience.types';
import { FeatureDisabledError } from './resilience.errors';

/** Higher rank = more important; never shed before lower ranks. */
const PRIORITY_RANK: Record<FeaturePriority, number> = {
  [FeaturePriority.OPTIONAL]: 1,
  [FeaturePriority.STANDARD]: 2,
  [FeaturePriority.ESSENTIAL]: 3,
};

/**
 * Minimum priority rank that stays enabled at each degradation level.
 * NORMAL keeps everything; PARTIAL sheds OPTIONAL; SEVERE keeps only ESSENTIAL.
 */
const LEVEL_THRESHOLD: Record<DegradationLevel, number> = {
  [DegradationLevel.NORMAL]: PRIORITY_RANK[FeaturePriority.OPTIONAL],
  [DegradationLevel.PARTIAL]: PRIORITY_RANK[FeaturePriority.STANDARD],
  [DegradationLevel.SEVERE]: PRIORITY_RANK[FeaturePriority.ESSENTIAL],
};

/**
 * Graceful degradation strategies.
 *
 * Tracks an overall degradation level and a registry of features tagged by
 * priority. As the level rises, lower-priority features are automatically
 * shed so that scarce capacity is reserved for the essential ones (auth,
 * payments, core reads). Call sites guard optional work with
 * {@link isFeatureEnabled} or {@link assertFeatureEnabled}.
 */
@Injectable()
export class DegradationService {
  private readonly logger = new Logger(DegradationService.name);

  private level: DegradationLevel = DegradationLevel.NORMAL;
  private reason?: string;
  private since = new Date();

  /** feature name -> priority */
  private readonly features = new Map<string, FeaturePriority>();

  /**
   * Register a feature so it can be gated by degradation level. Unregistered
   * features are treated as {@link FeaturePriority.STANDARD} when queried.
   */
  registerFeature(
    name: string,
    priority: FeaturePriority = FeaturePriority.STANDARD,
  ): void {
    this.features.set(name, priority);
  }

  /** Set the current degradation level. No-op if the level is unchanged. */
  setLevel(level: DegradationLevel, reason?: string): void {
    if (level === this.level) {
      this.reason = reason ?? this.reason;
      return;
    }

    const previous = this.level;
    this.level = level;
    this.reason = reason;
    this.since = new Date();

    const message = `Degradation level changed: ${previous} -> ${level}${
      reason ? ` (${reason})` : ''
    }`;
    if (level === DegradationLevel.NORMAL) {
      this.logger.log(message);
    } else {
      this.logger.warn(message);
    }
  }

  getLevel(): DegradationLevel {
    return this.level;
  }

  /** Whether the system is in any non-normal state. */
  isDegraded(): boolean {
    return this.level !== DegradationLevel.NORMAL;
  }

  /**
   * Whether a feature should currently run. A feature is enabled when its
   * priority rank meets or exceeds the threshold for the current level.
   */
  isFeatureEnabled(name: string): boolean {
    const priority = this.features.get(name) ?? FeaturePriority.STANDARD;
    return PRIORITY_RANK[priority] >= LEVEL_THRESHOLD[this.level];
  }

  /**
   * Throws {@link FeatureDisabledError} when the feature is currently shed.
   * Useful as a guard at the top of an optional code path.
   */
  assertFeatureEnabled(name: string): void {
    if (!this.isFeatureEnabled(name)) {
      throw new FeatureDisabledError(name, this.level);
    }
  }

  /** Full status snapshot for health endpoints / dashboards. */
  getStatus(): DegradationStatus {
    const features: FeatureStatus[] = Array.from(this.features.entries()).map(
      ([name, priority]) => ({
        name,
        priority,
        enabled: this.isFeatureEnabled(name),
      }),
    );

    return {
      level: this.level,
      reason: this.reason,
      since: this.since,
      features,
    };
  }
}
