import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from './alert.service';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertService],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleAlert', () => {
    it('should handle firing alert', async () => {
      const payload = {
        alerts: [
          {
            status: 'firing',
            labels: {
              alertname: 'HighErrorRate',
              severity: 'critical',
            },
            annotations: {
              summary: 'High error rate detected',
              description: 'Error rate is 0.1 errors/sec',
            },
            startsAt: new Date().toISOString(),
            generatorURL: 'http://prometheus:9090',
          },
        ],
      };

      await expect(service.handleAlert(payload)).resolves.not.toThrow();
    });

    it('should handle resolved alert', async () => {
      const payload = {
        alerts: [
          {
            status: 'resolved',
            labels: {
              alertname: 'HighErrorRate',
              severity: 'critical',
            },
            annotations: {
              summary: 'High error rate resolved',
              description: 'Error rate is back to normal',
            },
            startsAt: new Date().toISOString(),
            endsAt: new Date().toISOString(),
            generatorURL: 'http://prometheus:9090',
          },
        ],
      };

      await expect(service.handleAlert(payload)).resolves.not.toThrow();
    });
  });
});
