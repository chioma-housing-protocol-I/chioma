import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
import { FxRateService } from './fx-rate.service';
import { SupportedCurrency } from '../transactions/entities/supported-currency.entity';
import { CacheService } from '../../common/cache/cache.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FxRateService', () => {
  let service: FxRateService;
  let cacheService: Pick<CacheService, 'get' | 'set'>;

  const mockSupportedCurrencyRepo = {
    findOne: jest.fn(),
  };

  const activeCurrency = (code: string): SupportedCurrency =>
    ({
      id: `currency-${code}`,
      code,
      isActive: true,
    }) as SupportedCurrency;

  /** Minimal in-memory stand-in so caching behavior is actually exercised across calls within a test, not just asserted via mock call counts. */
  const buildFakeCacheService = (): Pick<CacheService, 'get' | 'set'> => {
    const store = new Map<string, unknown>();
    return {
      get: jest.fn(async (key: string) => store.get(key) ?? null) as never,
      set: jest.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }) as never,
    };
  };

  const buildModule = async (
    configOverrides: Record<string, string> = {},
  ): Promise<TestingModule> => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          FX_RATE_PROVIDER: 'mock',
          ...configOverrides,
        };
        return config[key] ?? defaultValue;
      }),
    };

    cacheService = buildFakeCacheService();

    return Test.createTestingModule({
      providers: [
        FxRateService,
        {
          provide: getRepositoryToken(SupportedCurrency),
          useValue: mockSupportedCurrencyRepo,
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mock provider (default)', () => {
    beforeEach(async () => {
      const module = await buildModule();
      service = module.get(FxRateService);
      mockSupportedCurrencyRepo.findOne.mockImplementation(({ where }) =>
        ['NGN', 'USD', 'XLM', 'USDC'].includes(where.code)
          ? Promise.resolve(activeCurrency(where.code))
          : Promise.resolve(null),
      );
    });

    it('resolves a known currency pair to a deterministic rate', async () => {
      const result = await service.getRate('NGN', 'XLM');

      expect(result.rate).toBeGreaterThan(0);
      expect(result.source).toBe('mock');
      expect(result.fromCurrency).toBe('NGN');
      expect(result.toCurrency).toBe('XLM');
    });

    it('returns rate 1 without a currency lookup when from === to', async () => {
      const result = await service.getRate('XLM', 'XLM');

      expect(result.rate).toBe(1);
      expect(mockSupportedCurrencyRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects an unsupported currency', async () => {
      mockSupportedCurrencyRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.getRate('ZZZ', 'XLM')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an inactive/unknown currency pair with no mock rate configured', async () => {
      // Both currencies are "supported" per the repo mock, but no mock rate
      // exists for this specific pair — must fail, not fall back to 1:1.
      await expect(service.getRate('USD', 'NGN')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('converts a fiat amount at the resolved rate', async () => {
      const { convertedAmount, rateResult } = await service.convert(
        160_000,
        'NGN',
        'USDC',
      );

      expect(convertedAmount).toBeCloseTo(160_000 * (1 / 1600), 6);
      expect(rateResult.source).toBe('mock');
    });

    it('rejects a negative or non-finite amount before any rate lookup', async () => {
      await expect(service.convert(-1, 'NGN', 'USDC')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.convert(Number.NaN, 'NGN', 'USDC')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSupportedCurrencyRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('rate snapshotting', () => {
    beforeEach(async () => {
      const module = await buildModule();
      service = module.get(FxRateService);
      mockSupportedCurrencyRepo.findOne.mockResolvedValue(
        activeCurrency('NGN'),
      );
    });

    it('returns a resolvedAt timestamp and rate that do not change retroactively across calls', async () => {
      const first = await service.getRate('NGN', 'XLM');
      const second = await service.getRate('NGN', 'XLM');

      // Same mock-rate table -> same numeric rate every call (deterministic),
      // but each call captures its own resolution timestamp/result object,
      // which is what makes settlement-time snapshotting on a payment record
      // meaningful rather than reading a shared mutable rate elsewhere.
      expect(first.rate).toBe(second.rate);
      expect(first).not.toBe(second);
    });
  });

  describe('external provider', () => {
    beforeEach(async () => {
      // Must be set before the module (and therefore the service's
      // constructor, which calls axios.create()) is built — otherwise the
      // service captures an unmocked axios instance.
      mockedAxios.create.mockReturnValue(mockedAxios);

      const module = await buildModule({
        FX_RATE_PROVIDER: 'external',
        FX_RATE_PROVIDER_URL: 'https://fx.example.com',
        FX_RATE_PROVIDER_API_KEY: 'test-key',
      });
      service = module.get(FxRateService);
      mockSupportedCurrencyRepo.findOne.mockResolvedValue(
        activeCurrency('NGN'),
      );
    });

    it('resolves a rate from the external provider response', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { rate: 0.00025 } });

      const result = await service.getRate('NGN', 'USDC');

      expect(result.rate).toBe(0.00025);
      expect(result.source).toBe('external');
    });

    it('throws instead of falling back when the provider request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(service.getRate('NGN', 'USDC')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws instead of falling back when the provider returns an invalid rate', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { rate: -1 } });

      await expect(service.getRate('NGN', 'USDC')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws instead of falling back when the provider omits the rate field', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      await expect(service.getRate('NGN', 'USDC')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('caches a successful lookup so a second call for the same pair does not hit the provider again (#2093)', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { rate: 0.00025 } });

      const first = await service.getRate('NGN', 'USDC');
      const second = await service.getRate('NGN', 'USDC');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(second.rate).toBe(first.rate);
      expect(second.source).toBe('external');
    });

    it('caches each currency pair independently', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { rate: 0.00025 } })
        .mockResolvedValueOnce({ data: { rate: 0.00031 } });

      const ngnToUsdc = await service.getRate('NGN', 'USDC');
      const ngnToXlm = await service.getRate('NGN', 'XLM');
      await service.getRate('NGN', 'USDC');
      await service.getRate('NGN', 'XLM');

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(ngnToUsdc.rate).toBe(0.00025);
      expect(ngnToXlm.rate).toBe(0.00031);
    });

    it('does not cache a failed lookup, so the next call retries the provider', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({ data: { rate: 0.00025 } });

      await expect(service.getRate('NGN', 'USDC')).rejects.toThrow(
        InternalServerErrorException,
      );
      const result = await service.getRate('NGN', 'USDC');

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result.rate).toBe(0.00025);
    });

    it('preserves the original resolution timestamp on a cache hit rather than reporting the cache-hit time', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { rate: 0.00025 } });

      const first = await service.getRate('NGN', 'USDC');
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await service.getRate('NGN', 'USDC');

      expect(second.resolvedAt.getTime()).toBe(first.resolvedAt.getTime());
    });
  });
});
