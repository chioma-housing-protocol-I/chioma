import { Injectable, Logger } from '@nestjs/common';

export interface Alert {
  status: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt?: string;
  generatorURL: string;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  async handleAlert(payload: any) {
    const alerts = payload.alerts || [];

    for (const alert of alerts) {
      if (alert.status === 'firing') {
        await this.handleFiringAlert(alert);
      } else if (alert.status === 'resolved') {
        await this.handleResolvedAlert(alert);
      }
    }
  }

  private async handleFiringAlert(alert: Alert) {
    const severity = alert.labels.severity || 'info';
    const alertName = alert.labels.alertname;
    const summary = alert.annotations.summary;
    const description = alert.annotations.description;

    this.logger.warn(
      `🚨 ALERT FIRING [${severity.toUpperCase()}]: ${alertName}`,
      {
        summary,
        description,
        labels: alert.labels,
      },
    );

    // Send notifications based on severity
    if (severity === 'critical') {
      await this.sendCriticalNotification(alert);
    }
  }

  private async handleResolvedAlert(alert: Alert) {
    const alertName = alert.labels.alertname;
    this.logger.log(`✅ ALERT RESOLVED: ${alertName}`);
  }

  private async sendCriticalNotification(alert: Alert) {
    // Implement notification logic (email, Slack, PagerDuty, etc.)
    this.logger.error('Critical alert requires immediate attention', {
      alert: alert.labels.alertname,
      summary: alert.annotations.summary,
    });
  }
}
