import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import {
  HealthCheckError,
  HealthCheckResult,
  HealthIndicatorStatus,
} from '@nestjs/terminus';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enhanceHealthResult', () => {
    it('should enhance health result with basic information', () => {
      const mockResult: HealthCheckResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {
          database: {
            status: 'up' as HealthIndicatorStatus,
            responseTime: 120,
          },
          stellar: { status: 'up' as HealthIndicatorStatus, responseTime: 450 },
        },
      };

      const enhanced = service.enhanceHealthResult(mockResult);

      expect(enhanced).toMatchObject({
        status: 'ok',
        version: expect.any(String),
        uptime: expect.any(Number),
        services: {
          database: { status: 'up', responseTime: 120 },
          stellar: { status: 'up', responseTime: 450 },
        },
      });
      expect(enhanced.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it('should include detailed information when requested', () => {
      const mockResult: HealthCheckResult = {
        status: 'ok' as const,
        info: {},
        error: {},
        details: {
          database: {
            status: 'up' as HealthIndicatorStatus,
            responseTime: 120,
          },
        },
      };

      const enhanced = service.enhanceHealthResult(mockResult, true);

      expect(enhanced.environment).toBeDefined();
      expect(enhanced.details).toMatchObject({
        nodeVersion: expect.any(String),
        platform: expect.any(String),
        architecture: expect.any(String),
        processId: expect.any(Number),
        memoryUsage: expect.any(Object),
      });
    });

    it('should determine warning status for partial failures', () => {
      const mockResult: HealthCheckResult = {
        status: 'error' as const,
        info: {
          database: {
            status: 'up' as HealthIndicatorStatus,
            responseTime: 120,
          },
        },
        error: {
          stellar: {
            status: 'down' as HealthIndicatorStatus,
            responseTime: null,
          },
        },
        details: {
          database: {
            status: 'up' as HealthIndicatorStatus,
            responseTime: 120,
          },
          stellar: {
            status: 'down' as HealthIndicatorStatus,
            responseTime: null,
          },
        },
      };

      const enhanced = service.enhanceHealthResult(mockResult);

      expect(enhanced.status).toBe('warning');
    });

    it('should determine error status for complete failures', () => {
      const mockResult: HealthCheckResult = {
        status: 'error' as const,
        info: {},
        error: {
          database: {
            status: 'down' as HealthIndicatorStatus,
            responseTime: null,
          },
          stellar: {
            status: 'down' as HealthIndicatorStatus,
            responseTime: null,
          },
        },
        details: {
          database: {
            status: 'down' as HealthIndicatorStatus,
            responseTime: null,
          },
          stellar: {
            status: 'down' as HealthIndicatorStatus,
            responseTime: null,
          },
        },
      };

      const enhanced = service.enhanceHealthResult(mockResult);

      expect(enhanced.status).toBe('error');
    });
  });

  describe('degraded vs unhealthy classification', () => {
    it('treats a failing redis indicator as a warning, not an error', () => {
      const mockResult: HealthCheckResult = {
        status: 'error' as const,
        info: { database: { status: 'up' as HealthIndicatorStatus } },
        error: { redis: { status: 'down' as HealthIndicatorStatus } },
        details: {
          database: { status: 'up' as HealthIndicatorStatus },
          redis: { status: 'down' as HealthIndicatorStatus },
        },
      };

      const enhanced = service.enhanceHealthResult(mockResult);

      expect(enhanced.status).toBe('warning');
      expect(enhanced.services.redis.criticality).toBe('degraded');
    });

    it('treats a failing elasticsearch indicator as a warning, not an error', () => {
      const mockResult: HealthCheckResult = {
        status: 'error' as const,
        info: { database: { status: 'up' as HealthIndicatorStatus } },
        error: { elasticsearch: { status: 'down' as HealthIndicatorStatus } },
        details: {
          database: { status: 'up' as HealthIndicatorStatus },
          elasticsearch: { status: 'down' as HealthIndicatorStatus },
        },
      };

      const enhanced = service.enhanceHealthResult(mockResult);

      expect(enhanced.status).toBe('warning');
      expect(enhanced.services.elasticsearch.criticality).toBe('degraded');
    });

    it('treats a failing database indicator as an error even when others are up', () => {
      const mockResult: HealthCheckResult = {
        status: 'error' as const,
        info: {
          redis: { status: 'up' as HealthIndicatorStatus },
          elasticsearch: { status: 'up' as HealthIndicatorStatus },
        },
        error: { database: { status: 'down' as HealthIndicatorStatus } },
        details: {
          database: { status: 'down' as HealthIndicatorStatus },
          redis: { status: 'up' as HealthIndicatorStatus },
          elasticsearch: { status: 'up' as HealthIndicatorStatus },
        },
      };

      const enhanced = service.enhanceHealthResult(mockResult);

      expect(enhanced.status).toBe('error');
      expect(enhanced.services.database.criticality).toBe('critical');
    });

    it('does not let a skipped indicator affect the overall status', () => {
      const mockResult: HealthCheckResult = {
        status: 'ok' as const,
        info: {
          database: { status: 'up' as HealthIndicatorStatus },
          redis: { status: 'skipped' as unknown as HealthIndicatorStatus },
        },
        error: {},
        details: {
          database: { status: 'up' as HealthIndicatorStatus },
          redis: { status: 'skipped' as unknown as HealthIndicatorStatus },
        },
      };

      const enhanced = service.enhanceHealthResult(mockResult);

      expect(enhanced.status).toBe('ok');
    });
  });

  describe('handlePartialFailure', () => {
    it('should handle HealthCheckError with causes', () => {
      const mockCauses = {
        database: { status: 'up' as HealthIndicatorStatus, responseTime: 120 },
        stellar: {
          status: 'down' as HealthIndicatorStatus,
          responseTime: null,
        },
      };

      const mockError = new HealthCheckError('Health check failed', mockCauses);

      const result = service.handlePartialFailure(mockError);

      expect(result.status).toBe('warning');
      expect(result.services).toMatchObject({
        database: { status: 'up', responseTime: 120 },
        stellar: { status: 'down', responseTime: null },
      });
    });

    it('should handle generic errors', () => {
      const mockError = new Error('Generic error');

      const result = service.handlePartialFailure(mockError);

      expect(result.status).toBe('error');
      expect(result.services).toEqual({});
    });

    it('should include detailed information when requested', () => {
      const mockError = new Error('Test error');

      const result = service.handlePartialFailure(mockError, true);

      expect(result.details).toMatchObject({
        nodeVersion: expect.any(String),
        platform: expect.any(String),
        architecture: expect.any(String),
        processId: expect.any(Number),
        memoryUsage: expect.any(Object),
        error: 'Test error',
      });
    });
  });
});
