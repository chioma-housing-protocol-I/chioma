import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ErrorNotificationService } from './error-notification.service';
import { EmailService } from '../notifications/email.service';
import { AlertPayload, AlertSeverity, EscalationTier } from './alert.types';

describe('ErrorNotificationService', () => {
  let service: ErrorNotificationService;
  let emailService: jest.Mocked<Pick<EmailService, 'sendAlertEmail'>>;
  let httpService: { post: jest.Mock };

  const baseAlert: AlertPayload = {
    status: 'firing',
    labels: {
      alertname: 'HighErrorRate',
      severity: 'critical',
    },
    annotations: {
      summary: 'High error rate detected',
      description: 'Error rate is elevated',
    },
    startsAt: new Date().toISOString(),
    generatorURL: 'http://prometheus:9090',
  };

  const config: Record<string, string> = {
    ERROR_NOTIFICATION_ENABLED: 'true',
    ALERT_ONCALL_EMAIL: 'oncall@chioma.app',
    ALERT_ESCALATION_EMAIL: 'platform@chioma.app',
    ALERT_MANAGEMENT_EMAIL: 'leads@chioma.app',
    SLACK_ALERT_WEBHOOK_URL: 'https://hooks.slack.com/services/test',
  };

  beforeEach(async () => {
    emailService = {
      sendAlertEmail: jest.fn().mockResolvedValue(undefined),
    };
    httpService = {
      post: jest.fn().mockReturnValue(of({ data: 'ok' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorNotificationService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] ?? null },
        },
        { provide: EmailService, useValue: emailService },
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get(ErrorNotificationService);
  });

  it('should be enabled when ERROR_NOTIFICATION_ENABLED=true', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('sends on-call email and Slack for critical alerts', async () => {
    await service.notifyAlert(baseAlert, EscalationTier.ONCALL);

    expect(emailService.sendAlertEmail).toHaveBeenCalledWith(
      'oncall@chioma.app',
      expect.stringContaining('HighErrorRate'),
      expect.objectContaining({ message: expect.any(String) }),
    );
    expect(httpService.post).toHaveBeenCalled();
  });

  it('uses escalation recipients for team tier', async () => {
    await service.notifyAlert(baseAlert, EscalationTier.TEAM);

    expect(emailService.sendAlertEmail).toHaveBeenCalledWith(
      'platform@chioma.app',
      expect.stringContaining('Escalated'),
      expect.any(Object),
    );
  });

  it('skips email when notifications are disabled', async () => {
    config.ERROR_NOTIFICATION_ENABLED = 'false';

    await service.notifyAlert(baseAlert, EscalationTier.ONCALL);

    expect(emailService.sendAlertEmail).not.toHaveBeenCalled();
    config.ERROR_NOTIFICATION_ENABLED = 'true';
  });

  it('continues when Slack delivery fails', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new Error('Slack unavailable')),
    );

    await expect(
      service.notifyAlert(baseAlert, EscalationTier.TEAM),
    ).resolves.not.toThrow();
    expect(emailService.sendAlertEmail).toHaveBeenCalled();
  });

  it('notifies health degradation to on-call for error status', async () => {
    await service.notifyHealthDegradation({
      status: 'error',
      summary: 'Database unhealthy',
      services: { database: { status: 'down' } },
    });

    expect(emailService.sendAlertEmail).toHaveBeenCalledWith(
      'oncall@chioma.app',
      expect.stringContaining('ERROR'),
      expect.any(Object),
    );
  });

  it('identifies actionable severities', () => {
    expect(service.isActionableSeverity(AlertSeverity.CRITICAL)).toBe(true);
    expect(service.isActionableSeverity(AlertSeverity.INFO)).toBe(false);
  });
});
