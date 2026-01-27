import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { StellarHealthIndicator } from './indicators/stellar.indicator';
import { MemoryHealthIndicator } from './indicators/memory.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
    private databaseHealthIndicator: DatabaseHealthIndicator,
    private stellarHealthIndicator: StellarHealthIndicator,
    private memoryHealthIndicator: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(@Res() res: Response) {
    try {
      const result = await this.health.check([
        () => this.databaseHealthIndicator.isHealthy('database'),
        () => this.stellarHealthIndicator.isHealthy('stellar'),
        () => this.memoryHealthIndicator.isHealthy('memory'),
      ]);

      const enhancedResult = this.healthService.enhanceHealthResult(result);

      // Determine HTTP status based on overall health
      const status = this.determineHttpStatus(enhancedResult.status);

      return res.status(status).json(enhancedResult);
    } catch (error) {
      // Handle partial failures with graceful degradation
      const degradedResult = this.healthService.handlePartialFailure(
        error as Error & { causes?: Record<string, unknown> },
      );
      const status = this.determineHttpStatus(degradedResult.status);

      return res.status(status).json(degradedResult);
    }
  }

  @Get('detailed')
  @HealthCheck()
  async detailedCheck(@Res() res: Response) {
    try {
      const result = await this.health.check([
        () => this.databaseHealthIndicator.isHealthy('database'),
        () => this.stellarHealthIndicator.isHealthy('stellar'),
        () => this.memoryHealthIndicator.isHealthy('memory'),
      ]);

      const detailedResult = this.healthService.enhanceHealthResult(
        result,
        true,
      );
      const status = this.determineHttpStatus(detailedResult.status);

      return res.status(status).json(detailedResult);
    } catch (error) {
      const degradedResult = this.healthService.handlePartialFailure(
        error as Error & { causes?: Record<string, unknown> },
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
