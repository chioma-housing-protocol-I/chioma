import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class StellarHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(StellarHealthIndicator.name);
  private readonly stellarHorizonUrl: string;
  private readonly timeoutMs = 5000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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

      const responseData = response.data as
        | {
            horizon_version?: string;
            core_version?: string;
          }
        | undefined;
      const result = this.getStatus(key, true, {
        status: 'up',
        responseTime,
        network: this.getStellarNetwork(currentUrl),
        horizonVersion: responseData?.horizon_version || 'unknown',
        coreVersion: responseData?.core_version || 'unknown',
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

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime,
        error: (error as Error).message,
        url: currentUrl,
        network: this.getStellarNetwork(currentUrl),
      });

      throw new HealthCheckError('Stellar check failed', result);
    }
  }

  async checkLedger(): Promise<{
    latestLedger: number | null;
    timestamp: string | null;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.stellarHorizonUrl}/ledgers?limit=1&order=desc`)
          .pipe(timeout(this.timeoutMs)),
      );

      const responseData = response.data as
        | {
            _embedded?: {
              records?: Array<{
                sequence?: number;
                closed_at?: string;
              }>;
            };
          }
        | undefined;

      return {
        latestLedger: responseData?._embedded?.records?.[0]?.sequence || null,
        timestamp: responseData?._embedded?.records?.[0]?.closed_at || null,
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
