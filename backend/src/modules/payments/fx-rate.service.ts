import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SupportedCurrency } from '../transactions/entities/supported-currency.entity';

export interface FxRateResult {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: 'anchor' | 'external' | 'mock';
  resolvedAt: Date;
}

/**
 * Resolves the exchange rate used to convert a fiat-denominated rent amount
 * into the on-chain XLM/USDC amount actually settled through escrow (#1543).
 *
 * There is no rate-lookup capability on `AnchorService`/the anchor API
 * integration today (grepped `stellar/services/anchor.service.ts`: it only
 * exposes SEP-24 deposit/withdraw, no quote/rate endpoint), so this resolves
 * rates from an external FX provider, gated by `FX_RATE_PROVIDER`
 * (`mock` in development/test, matching the existing `PAYMENT_GATEWAY=mock`
 * convention in this codebase, or `external` to call a real provider via
 * `FX_RATE_PROVIDER_URL`/`FX_RATE_PROVIDER_API_KEY`). If `AnchorService` ever
 * gains a real quote/rate capability, that should become the `anchor` source
 * here rather than an external provider call.
 *
 * A rate that cannot be resolved MUST fail settlement rather than fall back
 * to a stale or 1:1 rate — every method here throws instead of returning a
 * guessed value.
 */
@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly provider: 'mock' | 'external';
  private readonly providerUrl: string;
  private readonly providerApiKey: string;

  constructor(
    @InjectRepository(SupportedCurrency)
    private readonly supportedCurrencyRepo: Repository<SupportedCurrency>,
    private readonly configService: ConfigService,
  ) {
    this.provider = (this.configService.get<string>('FX_RATE_PROVIDER') ||
      'mock') as 'mock' | 'external';
    this.providerUrl =
      this.configService.get<string>('FX_RATE_PROVIDER_URL') || '';
    this.providerApiKey =
      this.configService.get<string>('FX_RATE_PROVIDER_API_KEY') || '';

    this.axiosInstance = axios.create({
      baseURL: this.providerUrl,
      headers: this.providerApiKey
        ? { Authorization: `Bearer ${this.providerApiKey}` }
        : undefined,
      timeout: 10_000,
    });
  }

  /**
   * Resolves the current rate to convert one unit of `fromCurrency` into
   * `toCurrency`. Throws `BadRequestException` for an unsupported/unknown
   * currency, and `InternalServerErrorException` for a provider failure —
   * never returns a fallback rate.
   */
  async getRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<FxRateResult> {
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        rate: 1,
        source: 'mock',
        resolvedAt: new Date(),
      };
    }

    await this.validateCurrency(fromCurrency);
    await this.validateCurrency(toCurrency);

    if (this.provider === 'mock') {
      return this.getMockRate(fromCurrency, toCurrency);
    }

    return this.getExternalRate(fromCurrency, toCurrency);
  }

  /**
   * Converts a fiat amount into the on-chain settlement amount at the
   * currently-resolved rate. Returns both the converted amount and the
   * `FxRateResult` used, so callers can snapshot the rate alongside the
   * payment record (per #1543's rate-snapshotting requirement).
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ convertedAmount: number; rateResult: FxRateResult }> {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException(
        `Invalid amount for currency conversion: ${amount}`,
      );
    }

    const rateResult = await this.getRate(fromCurrency, toCurrency);
    return {
      convertedAmount: amount * rateResult.rate,
      rateResult,
    };
  }

  private async validateCurrency(currency: string): Promise<void> {
    const supportedCurrency = await this.supportedCurrencyRepo.findOne({
      where: { code: currency, isActive: true },
    });

    if (!supportedCurrency) {
      throw new BadRequestException(
        `Currency ${currency} is not supported or not active`,
      );
    }
  }

  /**
   * Deterministic, seeded rates for local development and tests — never
   * used when `FX_RATE_PROVIDER=external` is configured. Explicitly scoped
   * to a small fixed set of pairs so an unrecognized pair fails loudly
   * (per the "no 1:1/stale fallback" requirement) rather than guessing.
   */
  private getMockRate(fromCurrency: string, toCurrency: string): FxRateResult {
    const mockRates: Record<string, number> = {
      'NGN:USDC': 1 / 1600,
      'USD:USDC': 1,
      'NGN:XLM': 1 / 4200,
      'USD:XLM': 1 / 0.38,
    };

    const key = `${fromCurrency}:${toCurrency}`;
    const rate = mockRates[key];

    if (rate === undefined) {
      throw new InternalServerErrorException(
        `No mock FX rate configured for ${fromCurrency} -> ${toCurrency}`,
      );
    }

    return {
      fromCurrency,
      toCurrency,
      rate,
      source: 'mock',
      resolvedAt: new Date(),
    };
  }

  private async getExternalRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<FxRateResult> {
    try {
      const response = await this.axiosInstance.get<{ rate: number }>(
        '/rates',
        { params: { from: fromCurrency, to: toCurrency } },
      );

      const rate = response.data?.rate;
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
        throw new Error('Provider returned an invalid rate');
      }

      return {
        fromCurrency,
        toCurrency,
        rate,
        source: 'external',
        resolvedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `FX rate lookup failed for ${fromCurrency} -> ${toCurrency}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw new InternalServerErrorException(
        `Unable to resolve FX rate for ${fromCurrency} -> ${toCurrency}; settlement blocked`,
      );
    }
  }
}
