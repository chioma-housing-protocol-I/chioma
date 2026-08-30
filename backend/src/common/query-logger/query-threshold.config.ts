import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Query classes a slow-query threshold can be overridden for. Classification
 * is a simple prefix match on the (trimmed, uppercased) SQL text — good
 * enough to separate read traffic from writes without parsing the query.
 */
export type QueryClass = 'select' | 'insert' | 'update' | 'delete' | 'other';

export const QUERY_CLASSES: readonly QueryClass[] = [
  'select',
  'insert',
  'update',
  'delete',
  'other',
];

/**
 * Matches the default this module has always used
 * (`QUERY_ANALYSIS_SLOW_THRESHOLD_MS`, formerly a hardcoded module constant).
 */
export const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 200;

/**
 * Resolves the slow-query threshold used by {@link QueryAnalysisService},
 * with an optional override per query class (`select`/`insert`/`update`/
 * `delete`/`other`).
 *
 * Configuration (see `docs/CONFIGURATION_OPTIONS.md`):
 * - `QUERY_ANALYSIS_SLOW_THRESHOLD_MS` — default threshold in milliseconds,
 *   applied to any query class without its own override. Defaults to
 *   `200`ms, matching this module's previous fixed threshold. The right
 *   value differs per environment — e.g. a tighter threshold in staging to
 *   catch regressions early, a looser one in production to reduce noise.
 * - `QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS` — optional JSON object
 *   mapping query class to its own threshold, e.g.
 *   `{"select":150,"insert":400,"update":400,"delete":400}`. Any class left
 *   out falls back to the default above.
 */
@Injectable()
export class QueryThresholdConfig {
  private readonly logger = new Logger(QueryThresholdConfig.name);
  private readonly defaultThresholdMs: number;
  private readonly overrides: Partial<Record<QueryClass, number>>;

  constructor(private readonly configService: ConfigService) {
    this.defaultThresholdMs = this.parseThreshold(
      this.configService.get<string | number>(
        'QUERY_ANALYSIS_SLOW_THRESHOLD_MS',
      ),
      DEFAULT_SLOW_QUERY_THRESHOLD_MS,
    );

    this.overrides = this.parseOverrides(
      this.configService.get<string>(
        'QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS',
      ),
    );
  }

  /** The threshold applied to query classes without their own override. */
  get defaultThreshold(): number {
    return this.defaultThresholdMs;
  }

  /** The threshold (ms) that applies to a given raw SQL query string. */
  thresholdFor(query: string): number {
    const queryClass = this.classify(query);
    return this.overrides[queryClass] ?? this.defaultThresholdMs;
  }

  /** The threshold (ms) that applies to a given query class directly. */
  thresholdForClass(queryClass: QueryClass): number {
    return this.overrides[queryClass] ?? this.defaultThresholdMs;
  }

  classify(query: string): QueryClass {
    const trimmed = query?.trimStart().toUpperCase() ?? '';

    if (trimmed.startsWith('SELECT')) return 'select';
    if (trimmed.startsWith('INSERT')) return 'insert';
    if (trimmed.startsWith('UPDATE')) return 'update';
    if (trimmed.startsWith('DELETE')) return 'delete';
    return 'other';
  }

  private parseThreshold(
    value: string | number | undefined,
    fallback: number,
  ): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private parseOverrides(
    raw: string | undefined,
  ): Partial<Record<QueryClass, number>> {
    if (!raw) {
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('overrides must be a JSON object');
      }

      const result: Partial<Record<QueryClass, number>> = {};
      for (const [key, value] of Object.entries(
        parsed as Record<string, unknown>,
      )) {
        const queryClass = key.toLowerCase() as QueryClass;
        if (!QUERY_CLASSES.includes(queryClass)) {
          this.logger.warn(
            `Ignoring unknown query class "${key}" in QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS`,
          );
          continue;
        }
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
          this.logger.warn(
            `Ignoring invalid threshold for query class "${key}" in QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS`,
          );
          continue;
        }
        result[queryClass] = numeric;
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `Failed to parse QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS, ignoring overrides: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {};
    }
  }
}
