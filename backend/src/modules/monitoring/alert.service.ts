import { Injectable, Logger } from '@nestjs/common';
import { AlertPayload } from './alert.types';
import { ErrorEscalationService } from './error-escalation.service';
import { ErrorNotificationService } from './error-notification.service';
import { EscalationTier } from './alert.types';

export type Alert = AlertPayload;

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly errorNotificationService: ErrorNotificationService,
    private readonly errorEscalationService: ErrorEscalationService,
  ) {}

  async handleAlert(payload: { alerts?: AlertPayload[] }): Promise<void> {
    const alerts = payload.alerts ?? [];

    for (const alert of alerts) {
      if (alert.status === 'firing') {
        await this.handleFiringAlert(alert);
      } else if (alert.status === 'resolved') {
        await this.handleResolvedAlert(alert);
      }
    }
  }

  private async handleFiringAlert(alert: AlertPayload): Promise<void> {
    const severity = alert.labels.severity ?? 'info';
    const alertName = alert.labels.alertname;
    const summary = alert.annotations.summary;
    const description = alert.annotations.description;

    this.logger.warn(`ALERT FIRING [${severity.toUpperCase()}]: ${alertName}`, {
      summary,
      description,
      labels: alert.labels,
    });

    this.errorEscalationService.trackFiringAlert(alert);

    const normalizedSeverity = severity.toLowerCase();
    if (['critical', 'high', 'warning'].includes(normalizedSeverity)) {
      await this.errorNotificationService.notifyAlert(
        alert,
        EscalationTier.ONCALL,
      );
    }
  }

  private async handleResolvedAlert(alert: AlertPayload): Promise<void> {
    const alertName = alert.labels.alertname;
    this.logger.log(`ALERT RESOLVED: ${alertName}`);
    this.errorEscalationService.resolveAlert(alert);
    await this.errorNotificationService.notifyResolved(alert);
  }
}
