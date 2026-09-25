import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

const DEFAULT_TIMEOUT_MS = 3000;

interface ClusterHealthResponse {
  cluster_name?: string;
  status?: string;
  number_of_nodes?: number;
  active_shards?: number;
  unassigned_shards?: number;
}

/**
 * Health indicator for the Elasticsearch cluster backing property search.
 *
 * Elasticsearch is classified as a *degraded* dependency (see
 * `health.constants.ts`): `ElasticsearchService` falls back to PostgreSQL
 * full-text search when the cluster is unreachable, so an outage narrows
 * search quality rather than breaking the API.
 *
 * When `ELASTICSEARCH_URL` is unset the check reports `skipped` — running
 * without a cluster is a deliberate deployment choice, not a fault.
 */
@Injectable()
export class ElasticsearchHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(ElasticsearchHealthIndicator.name);
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    super();
    this.timeoutMs = Number(
      this.configService.get<string | number>(
        'ELASTICSEARCH_HEALTH_TIMEOUT_MS',
        DEFAULT_TIMEOUT_MS,
      ),
    );
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const url = this.configService.get<string>('ELASTICSEARCH_URL');

    if (!url) {
      return this.getStatus(key, true, {
        status: 'skipped',
        responseTime: 0,
        message:
          'Elasticsearch is not configured; search falls back to PostgreSQL',
      });
    }

    try {
      const body = await this.fetchClusterHealth(url);
      const responseTime = Date.now() - startTime;
      const clusterStatus = body.status ?? 'unknown';

      // A red cluster is reachable but has unassigned primary shards, so
      // searches return partial results. Surface it as a warning rather than
      // a hard failure.
      const status = clusterStatus === 'red' ? 'warning' : 'up';

      const result = this.getStatus(key, true, {
        status,
        responseTime,
        url,
        clusterStatus,
        clusterName: body.cluster_name ?? 'unknown',
        numberOfNodes: body.number_of_nodes ?? null,
        activeShards: body.active_shards ?? null,
        unassignedShards: body.unassigned_shards ?? null,
      });

      if (status === 'warning') {
        this.logger.warn(
          `Elasticsearch cluster reports status "red" (${responseTime}ms)`,
        );
      } else {
        this.logger.log(
          `Elasticsearch health check passed in ${responseTime}ms`,
        );
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Elasticsearch health check failed', error);

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime,
        url,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new HealthCheckError('Elasticsearch check failed', result);
    }
  }

  private async fetchClusterHealth(
    url: string,
  ): Promise<ClusterHealthResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `${url.replace(/\/+$/, '')}/_cluster/health`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new Error(`Elasticsearch responded with HTTP ${response.status}`);
      }

      return (await response.json()) as ClusterHealthResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Elasticsearch cluster health timed out after ${this.timeoutMs}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
