import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { StellarHealthIndicator } from './indicators/stellar.indicator';
import { MemoryHealthIndicator } from './indicators/memory.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';
import { ElasticsearchHealthIndicator } from './indicators/elasticsearch.indicator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
    private databaseHealthIndicator: DatabaseHealthIndicator,
    private stellarHealthIndicator: StellarHealthIndicator,
    private memoryHealthIndicator: MemoryHealthIndicator,
    private redisHealthIndicator: RedisHealthIndicator,
    private elasticsearchHealthIndicator: ElasticsearchHealthIndicator,
  ) {}

  /**
   * The indicator set shared by `/health` and `/health/detailed`.
   *
   * Failures are classified as degraded or unhealthy by `HealthService` using
   * the map in `health.constants.ts` — see `docs/HEALTH_CHECKS.md`.
   */
  private indicatorChecks() {
    return [
      () => this.databaseHealthIndicator.isHealthy('database'),
      () => this.redisHealthIndicator.isHealthy('redis'),
      () => this.elasticsearchHealthIndicator.isHealthy('elasticsearch'),
      () => this.stellarHealthIndicator.isHealthy('stellar'),
      () => this.memoryHealthIndicator.isHealthy('memory'),
    ];
  }

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Basic health check',
    description:
      'Returns overall status and per-service health for database, redis, ' +
      'elasticsearch, stellar and memory. Each service carries a ' +
      '`criticality` of `critical` or `degraded`: only a failing critical ' +
      'dependency makes the overall status `error`.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Service healthy (`ok`) or degraded (`warning`) — at least one ' +
      'non-critical dependency such as redis, elasticsearch or stellar is down',
  })
  @ApiResponse({
    status: 503,
    description: 'Service unhealthy — a critical dependency is down',
  })
  async check(@Res() res: Response) {
    try {
      const result = await this.health.check(this.indicatorChecks());

      const enhancedResult = this.healthService.enhanceHealthResult(result);

      // Determine HTTP status based on overall health
      const status = this.determineHttpStatus(enhancedResult.status);

      return res.status(status).json(enhancedResult);
    } catch (error) {
      // Handle partial failures with graceful degradation
      const degradedResult = this.healthService.handlePartialFailure(error);
      const status = this.determineHttpStatus(degradedResult.status);

      return res.status(status).json(degradedResult);
    }
  }

  @Get('detailed')
  @HealthCheck()
  @ApiOperation({
    summary: 'Detailed health check',
    description:
      'Same indicator set as `/health` plus system details (Node version, ' +
      'memory, PID).',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health info for a healthy or degraded service',
  })
  @ApiResponse({
    status: 503,
    description: 'Service unhealthy — a critical dependency is down',
  })
  async detailedCheck(@Res() res: Response) {
    try {
      const result = await this.health.check(this.indicatorChecks());

      const detailedResult = this.healthService.enhanceHealthResult(
        result,
        true,
      );
      const status = this.determineHttpStatus(detailedResult.status);

      return res.status(status).json(detailedResult);
    } catch (error) {
      const degradedResult = this.healthService.handlePartialFailure(
        error,
        true,
      );
      const status = this.determineHttpStatus(degradedResult.status);

      return res.status(status).json(degradedResult);
    }
  }

  private determineHttpStatus(healthStatus: string): number {
    switch (healthStatus) {
      case 'ok':
        return HttpStatus.OK;
      case 'warning':
        return HttpStatus.OK; // Graceful degradation
      case 'error':
        return HttpStatus.SERVICE_UNAVAILABLE;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
