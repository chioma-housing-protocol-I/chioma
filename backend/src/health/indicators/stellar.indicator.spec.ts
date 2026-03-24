import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { StellarHealthIndicator } from './stellar.indicator';

describe('StellarHealthIndicator', () => {
  let indicator: StellarHealthIndicator;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarHealthIndicator,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue('https://horizon-testnet.stellar.org'),
          },
        },
      ],
    }).compile();

    indicator = module.get<StellarHealthIndicator>(StellarHealthIndicator);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when Stellar is accessible', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          horizon_version: '2.0.0',
          core_version: '19.0.0',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await indicator.isHealthy('stellar');

      expect(result).toMatchObject({
        stellar: {
          status: 'up',
          responseTime: expect.any(Number),
          network: 'testnet',
          horizonVersion: '2.0.0',
          coreVersion: '19.0.0',
          url: 'https://horizon-testnet.stellar.org',
        },
      });
    });

    it('should throw HealthCheckError when Stellar is not accessible', async () => {
      const mockError = new Error('Network error');
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      await expect(indicator.isHealthy('stellar')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should handle timeout errors', async () => {
      const mockError = new Error('Timeout');
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      await expect(indicator.isHealthy('stellar')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should detect mainnet network', async () => {
      // Create a new indicator instance with mainnet URL
      const mainnetModule: TestingModule = await Test.createTestingModule({
        providers: [
          StellarHealthIndicator,
          {
            provide: HttpService,
            useValue: {
              get: jest.fn(),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue('https://horizon.stellar.org'),
            },
          },
        ],
      }).compile();

      const mainnetIndicator = mainnetModule.get<StellarHealthIndicator>(
        StellarHealthIndicator,
      );
      const mainnetHttpService = mainnetModule.get<HttpService>(HttpService);

      const mockResponse: AxiosResponse = {
        data: {
          horizon_version: '2.0.0',
          core_version: '19.0.0',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(mainnetHttpService, 'get').mockReturnValue(of(mockResponse));

      const result = await mainnetIndicator.isHealthy('stellar');

      expect(result.stellar.network).toBe('mainnet');
    });

    it('should detect custom network', async () => {
      // Create a new indicator instance with custom URL
      const customModule: TestingModule = await Test.createTestingModule({
        providers: [
          StellarHealthIndicator,
          {
            provide: HttpService,
            useValue: {
              get: jest.fn(),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest
                .fn()
                .mockReturnValue('https://custom-horizon.example.com'),
            },
          },
        ],
      }).compile();

      const customIndicator = customModule.get<StellarHealthIndicator>(
        StellarHealthIndicator,
      );
      const customHttpService = customModule.get<HttpService>(HttpService);

      const mockResponse: AxiosResponse = {
        data: {
          horizon_version: '2.0.0',
          core_version: '19.0.0',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(customHttpService, 'get').mockReturnValue(of(mockResponse));

      const result = await customIndicator.isHealthy('stellar');

      expect(result.stellar.network).toBe('custom');
    });
  });

  describe('checkLedger', () => {
    it('should return latest ledger information', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          _embedded: {
            records: [
              {
                sequence: 12345,
                closed_at: '2024-01-15T10:30:00Z',
              },
            ],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await indicator.checkLedger();

      expect(result).toEqual({
        latestLedger: 12345,
        timestamp: '2024-01-15T10:30:00Z',
      });
    });

    it('should handle empty ledger response', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          _embedded: {
            records: [],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await indicator.checkLedger();

      expect(result).toEqual({
        latestLedger: null,
        timestamp: null,
      });
    });

    it('should throw error when ledger request fails', async () => {
      const mockError = new Error('Ledger request failed');
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      await expect(indicator.checkLedger()).rejects.toThrow(
        'Ledger request failed',
      );
    });
  });
});
