import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { SorobanClientService } from '../../common/services/soroban-client.service';

/**
 * Health indicator for the Soroban RPC connection.
 *
 * Calls `SorobanClientService.checkConnection()` on every poll so the result
 * reflects current reachability rather than only the startup probe outcome.
 *
 * Soroban is classified as `degraded` in `health.constants.ts`: a failure
 * surfaces as `warning` (HTTP 200) rather than `error` (HTTP 503) because
 * non-blockchain request paths continue to work and on-chain writes are queued
 * and retried by background jobs.
 */
@Injectable()
export class SorobanHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(SorobanHealthIndicator.name);

  constructor(private readonly sorobanClient: SorobanClientService) {
    super();
  }

  /**
   * @param key - Indicator name surfaced in the `/health` response body.
   *              Callers should pass `'soroban'`.
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const state = await this.sorobanClient.checkConnection();
    const responseTime = Date.now() - startTime;

    if (state.status === 'connected') {
      this.logger.log(`Soroban health check passed in ${responseTime}ms`);

      return this.getStatus(key, true, {
        status: 'up',
        responseTime,
        rpcUrl: state.rpcUrl,
        latestLedger: state.latestLedger,
        lastConnectedAt: state.lastConnectedAt,
      });
    }

    this.logger.error(
      `Soroban health check failed: ${state.failureReason ?? 'unknown reason'}`,
    );

    const result = this.getStatus(key, false, {
      status: 'down',
      responseTime,
      rpcUrl: state.rpcUrl,
      failureReason: state.failureReason,
      lastConnectedAt: state.lastConnectedAt,
    });

    throw new HealthCheckError('Soroban RPC unreachable', result);
  }
}
