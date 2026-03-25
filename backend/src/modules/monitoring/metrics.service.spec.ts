import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('HTTP Metrics', () => {
    it('should record HTTP request', () => {
      expect(() => {
        service.recordHttpRequest('GET', '/api/test', 200);
      }).not.toThrow();
    });

    it('should record HTTP duration', () => {
      expect(() => {
        service.recordHttpDuration('GET', '/api/test', 200, 0.5);
      }).not.toThrow();
    });
  });

  describe('Blockchain Metrics', () => {
    it('should record blockchain transaction', () => {
      expect(() => {
        service.recordBlockchainTransaction('payment', 'success');
      }).not.toThrow();
    });

    it('should record blockchain failure', () => {
      expect(() => {
        service.recordBlockchainFailure('payment', 'timeout');
      }).not.toThrow();
    });

    it('should record blockchain duration', () => {
      expect(() => {
        service.recordBlockchainDuration('payment', 2.5);
      }).not.toThrow();
    });
  });

  describe('Database Metrics', () => {
    it('should set database connections', () => {
      expect(() => {
        service.setDatabaseConnections(10);
      }).not.toThrow();
    });

    it('should record database query', () => {
      expect(() => {
        service.recordDatabaseQuery('SELECT', 0.05);
      }).not.toThrow();
    });
  });

  describe('Business Metrics', () => {
    it('should record rent payment', () => {
      expect(() => {
        service.recordRentPayment('success');
      }).not.toThrow();
    });

    it('should record NFT mint', () => {
      expect(() => {
        service.recordNftMint('rent_obligation');
      }).not.toThrow();
    });

    it('should record dispute', () => {
      expect(() => {
        service.recordDispute('security_deposit', 'open');
      }).not.toThrow();
    });
  });

  describe('Metrics Export', () => {
    it('should return metrics in Prometheus format', async () => {
      service.recordHttpRequest('GET', '/test', 200);
      const metrics = await service.getMetrics();
      expect(metrics).toContain('http_requests');
      expect(metrics).toContain('Chioma Backend Metrics');
    });
  });
});
