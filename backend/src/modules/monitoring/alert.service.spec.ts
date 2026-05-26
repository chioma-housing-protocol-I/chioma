import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from './alert.service';
import { ErrorNotificationService } from './error-notification.service';
import { ErrorEscalationService } from './error-escalation.service';
import { EscalationTier } from './alert.types';

describe('AlertService', () => {
  let service: AlertService;
  let errorNotificationService: jest.Mocked<
    Pick<ErrorNotificationService, 'notifyAlert' | 'notifyResolved'>
  >;
  let errorEscalationService: jest.Mocked<
    Pick<ErrorEscalationService, 'trackFiringAlert' | 'resolveAlert'>
  >;

  beforeEach(async () => {
    errorNotificationService = {
      notifyAlert: jest.fn().mockResolvedValue(undefined),
      notifyResolved: jest.fn().mockResolvedValue(undefined),
    };
    errorEscalationService = {
      trackFiringAlert: jest.fn(),
      resolveAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        {
          provide: ErrorNotificationService,
          useValue: errorNotificationService,
        },
        {
          provide: ErrorEscalationService,
          useValue: errorEscalationService,
        },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleAlert', () => {
    it('should handle firing critical alert with notification and tracking', async () => {
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
      expect(errorEscalationService.trackFiringAlert).toHaveBeenCalled();
      expect(errorNotificationService.notifyAlert).toHaveBeenCalledWith(
        payload.alerts[0],
        EscalationTier.ONCALL,
      );
    });

    it('should not notify for info-level firing alerts', async () => {
      const payload = {
        alerts: [
          {
            status: 'firing',
            labels: {
              alertname: 'LowPriority',
              severity: 'info',
            },
            annotations: {
              summary: 'Informational alert',
              description: 'No action required',
            },
            startsAt: new Date().toISOString(),
            generatorURL: 'http://prometheus:9090',
          },
        ],
      };

      await service.handleAlert(payload);

      expect(errorEscalationService.trackFiringAlert).toHaveBeenCalled();
      expect(errorNotificationService.notifyAlert).not.toHaveBeenCalled();
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
      expect(errorEscalationService.resolveAlert).toHaveBeenCalled();
      expect(errorNotificationService.notifyResolved).toHaveBeenCalled();
    });
  });
});
