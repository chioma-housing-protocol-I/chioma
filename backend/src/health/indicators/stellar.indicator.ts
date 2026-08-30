import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';
import { MetricsService } from '../../modules/monitoring/metrics.service';

@Injectable()
export class StellarHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(StellarHealthIndicator.name);
  private readonly stellarHorizonUrl: string;
  private readonly timeoutMs = 5000;
  private consecutiveFailures = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
    super();
    // Default to testnet, can be configured via environment variables
    this.stellarHorizonUrl = this.configService.get<string>(
      'STELLAR_HORIZON_URL',
      'https://horizon-testnet.stellar.org',
    );
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Use the current stellarHorizonUrl which may have been updated by tests
      const currentUrl = this.configService.get<string>(
        'STELLAR_HORIZON_URL',
        this.stellarHorizonUrl,
      );

      // Check Stellar Horizon server health
      const response = await firstValueFrom(
        this.httpService.get(`${currentUrl}/`).pipe(timeout(this.timeoutMs)),
      );

      const responseTime = Date.now() - startTime;
      const network = this.getStellarNetwork(currentUrl);

      this.consecutiveFailures = 0;
      this.metricsService.recordBlockchainConnectivityCheck(
        network,
        true,
        responseTime,
        this.consecutiveFailures,
      );

      const result = this.getStatus(key, true, {
        status: 'up',
        responseTime,
        network,
        horizonVersion: response.data?.horizon_version || 'unknown',
        coreVersion: response.data?.core_version || 'unknown',
        url: currentUrl,
      });

      this.logger.log(`Stellar health check passed in ${responseTime}ms`);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Stellar health check failed', error);

      const currentUrl = this.configService.get<string>(
        'STELLAR_HORIZON_URL',
        this.stellarHorizonUrl,
      );
      const network = this.getStellarNetwork(currentUrl);

      this.consecutiveFailures += 1;
      this.metricsService.recordBlockchainConnectivityCheck(
        network,
        false,
        responseTime,
        this.consecutiveFailures,
      );

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime,
        error: error.message,
        url: currentUrl,
        network,
        consecutiveFailures: this.consecutiveFailures,
      });

      throw new HealthCheckError('Stellar check failed', result);
    }
  }

  async checkLedger(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.stellarHorizonUrl}/ledgers?limit=1&order=desc`)
          .pipe(timeout(this.timeoutMs)),
      );

      return {
        latestLedger: response.data?._embedded?.records?.[0]?.sequence || null,
        timestamp: response.data?._embedded?.records?.[0]?.closed_at || null,
      };
    } catch (error) {
      this.logger.error('Failed to fetch latest ledger', error);
      throw error;
    }
  }

  private getStellarNetwork(url?: string): string {
    const targetUrl = (url || this.stellarHorizonUrl).toLowerCase();
    if (targetUrl.includes('testnet')) {
      return 'testnet';
    } else if (
      targetUrl.includes('pubnet') ||
      targetUrl.includes('horizon.stellar.org')
    ) {
      return 'mainnet';
    } else {
      return 'custom';
    }
  }
}
