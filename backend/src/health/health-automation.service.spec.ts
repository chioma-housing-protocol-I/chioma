import { Test, TestingModule } from '@nestjs/testing';
import { HealthAutomationService } from './health-automation.service';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { StellarHealthIndicator } from './indicators/stellar.indicator';
import { MemoryHealthIndicator } from './indicators/memory.indicator';
import { Logger } from '@nestjs/common';

describe('HealthAutomationService', () => {
  let service: HealthAutomationService;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };
    const mockHealthService = {
      enhanceHealthResult: jest.fn(),
      handlePartialFailure: jest.fn(),
    };
    const mockDbIndicator = { isHealthy: jest.fn() };
    const mockStellarIndicator = { isHealthy: jest.fn() };
    const mockMemoryIndicator = { isHealthy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthAutomationService,
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: HealthService, useValue: mockHealthService },
        { provide: DatabaseHealthIndicator, useValue: mockDbIndicator },
        { provide: StellarHealthIndicator, useValue: mockStellarIndicator },
        { provide: MemoryHealthIndicator, useValue: mockMemoryIndicator },
      ],
    }).compile();

    service = module.get<HealthAutomationService>(HealthAutomationService);
    healthCheckService = module.get(HealthCheckService);
    healthService = module.get(HealthService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should run health checks without throwing', async () => {
    healthCheckService.check.mockResolvedValue({
      status: 'ok',
      info: {},
      error: {},
      details: {},
    });
    healthService.enhanceHealthResult.mockReturnValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: 100,
      services: {},
    });

    await expect(service.handleCron()).resolves.not.toThrow();
    expect(healthCheckService.check).toHaveBeenCalled();
  });

  it('should handle partial failure', async () => {
    healthCheckService.check.mockRejectedValue(new Error('failure'));
    healthService.handlePartialFailure.mockReturnValue({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: 100,
      services: {},
    });

    await expect(service.handleCron()).resolves.not.toThrow();
    expect(healthService.handlePartialFailure).toHaveBeenCalled();
  });
});
