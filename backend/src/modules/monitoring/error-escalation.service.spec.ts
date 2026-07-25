import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ErrorEscalationService } from './error-escalation.service';
import { ErrorNotificationService } from './error-notification.service';
import { AlertPayload, EscalationTier } from './alert.types';

describe('ErrorEscalationService', () => {
  let service: ErrorEscalationService;
  let errorNotificationService: jest.Mocked<
    Pick<
      ErrorNotificationService,
      | 'isEnabled'
      | 'notifyAlert'
      | 'isActionableSeverity'
      | 'getRecipientsForTier'
    >
  >;

  const alert: AlertPayload = {
    status: 'firing',
    labels: {
      alertname: 'HighErrorRate',
      severity: 'critical',
      instance: 'backend-1',
    },
    annotations: {
      summary: 'High error rate detected',
      description: 'Error rate is elevated',
    },
    startsAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    generatorURL: 'http://prometheus:9090',
  };

  beforeEach(async () => {
    errorNotificationService = {
      isEnabled: jest.fn().mockReturnValue(true),
      notifyAlert: jest.fn().mockResolvedValue(undefined),
      isActionableSeverity: jest.fn().mockReturnValue(true),
      getRecipientsForTier: jest.fn().mockImplementation((tier) => {
        if (tier === EscalationTier.MANAGEMENT) {
          return ['leads@chioma.app'];
        }
        return ['oncall@chioma.app'];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorEscalationService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'ALERT_ESCALATION_MINUTES') return '15';
              if (key === 'ALERT_ESCALATION_TIER2_MINUTES') return '30';
              return null;
            },
          },
        },
        {
          provide: ErrorNotificationService,
          useValue: errorNotificationService,
        },
      ],
    }).compile();

    service = module.get(ErrorEscalationService);
  });

  it('tracks firing alerts by fingerprint', () => {
    service.trackFiringAlert(alert);
    expect(service.getActiveAlerts()).toHaveLength(1);
    expect(service.getActiveAlerts()[0].fingerprint).toContain('HighErrorRate');
  });

  it('removes alerts when resolved', () => {
    service.trackFiringAlert(alert);
    service.resolveAlert(alert);
    expect(service.getActiveAlerts()).toHaveLength(0);
  });

  it('escalates to team tier after configured delay', async () => {
    const tracked = service.trackFiringAlert(alert);
    tracked.lastEscalationTier = EscalationTier.ONCALL;

    await service.processEscalations();

    expect(errorNotificationService.notifyAlert).toHaveBeenCalledWith(
      alert,
      EscalationTier.TEAM,
    );
    expect(tracked.lastEscalationTier).toBe(EscalationTier.TEAM);
  });

  it('does not escalate when notifications are disabled', async () => {
    errorNotificationService.isEnabled.mockReturnValue(false);
    service.trackFiringAlert(alert);

    await service.processEscalations();

    expect(errorNotificationService.notifyAlert).not.toHaveBeenCalled();
  });

  it('builds stable fingerprints for identical labels', () => {
    const first = service.buildFingerprint(alert);
    const second = service.buildFingerprint({
      ...alert,
      labels: {
        instance: 'backend-1',
        alertname: 'HighErrorRate',
        severity: 'critical',
      },
    });
    expect(first).toBe(second);
  });
});
