import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('exposes a prom-client registry', () => {
    expect(service.getRegistry()).toBeDefined();
    expect(typeof service.getRegistry().metrics).toBe('function');
  });

  describe('HTTP metrics', () => {
    it('recordHttpRequest does not throw', () => {
      expect(() =>
        service.recordHttpRequest('GET', '/api/test', 200),
      ).not.toThrow();
    });

    it('recordHttpDuration does not throw', () => {
      expect(() =>
        service.recordHttpDuration('GET', '/api/test', 200, 42),
      ).not.toThrow();
    });

    it('getMetrics includes http_request_duration_ms histogram', async () => {
      service.recordHttpDuration('GET', '/api/properties', 200, 120);
      const output = await service.getMetrics();
      expect(output).toContain('http_request_duration_ms');
    });

    it('getMetrics includes http_requests_total counter', async () => {
      service.recordHttpRequest('POST', '/api/payments', 201);
      const output = await service.getMetrics();
      expect(output).toContain('http_requests_total');
    });

    it('status_class label is set correctly', async () => {
      service.recordHttpRequest('GET', '/api/test', 404);
      const output = await service.getMetrics();
      expect(output).toContain('status_class="4xx"');
    });
  });

  describe('Blockchain metrics', () => {
    it('recordBlockchainTransaction does not throw', () => {
      expect(() =>
        service.recordBlockchainTransaction('payment', 'success'),
      ).not.toThrow();
    });

    it('recordBlockchainFailure does not throw', () => {
      expect(() =>
        service.recordBlockchainFailure('payment', 'timeout'),
      ).not.toThrow();
    });

    it('recordBlockchainDuration does not throw', () => {
      expect(() =>
        service.recordBlockchainDuration('payment', 2500),
      ).not.toThrow();
    });
  });

  describe('Database metrics', () => {
    it('setDatabaseConnections does not throw', () => {
      expect(() => service.setDatabaseConnections(10)).not.toThrow();
    });

    it('recordDatabaseQuery does not throw', () => {
      expect(() => service.recordDatabaseQuery('SELECT', 50)).not.toThrow();
    });
  });

  describe('Business metrics', () => {
    it('recordRentPayment does not throw', () => {
      expect(() => service.recordRentPayment('success')).not.toThrow();
    });

    it('recordNftMint does not throw', () => {
      expect(() => service.recordNftMint('rent_obligation')).not.toThrow();
    });

    it('recordDispute does not throw', () => {
      expect(() =>
        service.recordDispute('security_deposit', 'open'),
      ).not.toThrow();
    });
  });
});
