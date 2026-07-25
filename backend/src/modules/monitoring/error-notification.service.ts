import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EmailService } from '../notifications/email.service';
import {
  AlertPayload,
  AlertSeverity,
  EscalationTier,
  HealthDegradationPayload,
} from './alert.types';

@Injectable()
export class ErrorNotificationService {
  private readonly logger = new Logger(ErrorNotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly httpService: HttpService,
  ) {}

  isEnabled(): boolean {
    return (
      this.configService.get<string>('ERROR_NOTIFICATION_ENABLED') === 'true'
    );
  }

  getRecipientsForTier(tier: EscalationTier): string[] {
    const oncall = this.configService.get<string>('ALERT_ONCALL_EMAIL');
    const escalation = this.configService.get<string>('ALERT_ESCALATION_EMAIL');
    const management = this.configService.get<string>('ALERT_MANAGEMENT_EMAIL');

    switch (tier) {
      case EscalationTier.ONCALL:
        return this.parseEmails(oncall);
      case EscalationTier.TEAM:
        return this.parseEmails(escalation ?? oncall);
      case EscalationTier.MANAGEMENT:
        return this.parseEmails(management ?? escalation ?? oncall);
      default:
        return [];
    }
  }

  async notifyAlert(alert: AlertPayload, tier: EscalationTier): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.debug('Error notifications disabled; alert logged only');
      return;
    }

    const severity = this.resolveSeverity(alert.labels.severity);
    const recipients = this.getRecipientsForTier(tier);
    const subject = this.buildSubject(alert, severity, tier);
    const message = this.buildMessage(alert, severity, tier);

    if (recipients.length > 0) {
      await Promise.all(
        recipients.map((email) =>
          this.emailService
            .sendAlertEmail(email, subject, {
              message,
              details: {
                alertname: alert.labels.alertname,
                severity,
                tier,
                summary: alert.annotations.summary,
                description: alert.annotations.description,
                labels: alert.labels,
                startsAt: alert.startsAt,
              },
            })
            .catch((error: unknown) => {
              this.logger.error(
                `Failed to send alert email to ${email}`,
                error instanceof Error ? error.stack : String(error),
              );
            }),
        ),
      );
    } else {
      this.logger.warn(
        `No recipients configured for escalation tier ${tier}; alert not emailed`,
      );
    }

    if (this.shouldNotifySlack(severity, tier)) {
      await this.sendSlackNotification(subject, message);
    }
  }

  async notifyResolved(alert: AlertPayload): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const severity = this.resolveSeverity(alert.labels.severity);
    if (!this.isActionableSeverity(severity)) {
      return;
    }

    const subject = `[RESOLVED] ${alert.labels.alertname ?? 'Alert'}`;
    const message = `Alert resolved: ${alert.annotations.summary ?? alert.labels.alertname}`;

    const recipients = this.getRecipientsForTier(EscalationTier.ONCALL);
    if (recipients.length > 0) {
      await Promise.all(
        recipients.map((email) =>
          this.emailService
            .sendAlertEmail(email, subject, { message })
            .catch((error: unknown) => {
              this.logger.error(
                `Failed to send resolved alert email to ${email}`,
                error instanceof Error ? error.stack : String(error),
              );
            }),
        ),
      );
    }

    await this.sendSlackNotification(subject, message);
  }

  async notifyHealthDegradation(
    payload: HealthDegradationPayload,
  ): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.warn(
        `Health degradation (${payload.status}): ${payload.summary}`,
      );
      return;
    }

    const tier =
      payload.status === 'error' ? EscalationTier.ONCALL : EscalationTier.TEAM;
    const subject = `[${payload.status.toUpperCase()}] Chioma health check degraded`;
    const message = `${payload.summary}\n\nServices:\n${JSON.stringify(payload.services, null, 2)}`;

    const recipients = this.getRecipientsForTier(tier);
    if (recipients.length > 0) {
      await Promise.all(
        recipients.map((email) =>
          this.emailService
            .sendAlertEmail(email, subject, {
              message,
              details: payload.services,
            })
            .catch((error: unknown) => {
              this.logger.error(
                `Failed to send health degradation email to ${email}`,
                error instanceof Error ? error.stack : String(error),
              );
            }),
        ),
      );
    }

    await this.sendSlackNotification(subject, message);
  }

  private async sendSlackNotification(
    subject: string,
    message: string,
  ): Promise<void> {
    const webhookUrl = this.configService.get<string>(
      'SLACK_ALERT_WEBHOOK_URL',
    );
    if (!webhookUrl) {
      this.logger.debug(
        'SLACK_ALERT_WEBHOOK_URL not configured; skipping Slack',
      );
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(webhookUrl, {
          text: `*${subject}*\n${message}`,
        }),
      );
      this.logger.log('Alert notification sent to Slack');
    } catch (error: unknown) {
      this.logger.error(
        'Failed to send Slack alert notification',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private buildSubject(
    alert: AlertPayload,
    severity: AlertSeverity,
    tier: EscalationTier,
  ): string {
    const alertName = alert.labels.alertname ?? 'UnknownAlert';
    const tierLabel =
      tier === EscalationTier.ONCALL
        ? 'On-Call'
        : tier === EscalationTier.TEAM
          ? 'Escalated'
          : 'Management';
    return `[${severity.toUpperCase()}][${tierLabel}] ${alertName}`;
  }

  private buildMessage(
    alert: AlertPayload,
    severity: AlertSeverity,
    tier: EscalationTier,
  ): string {
    const summary = alert.annotations.summary ?? alert.labels.alertname;
    const description =
      alert.annotations.description ?? 'No additional description provided.';
    return [
      `Severity: ${severity}`,
      `Escalation tier: ${tier}`,
      `Summary: ${summary}`,
      `Description: ${description}`,
      `Started at: ${alert.startsAt}`,
    ].join('\n');
  }

  private resolveSeverity(raw?: string): AlertSeverity {
    const normalized = (raw ?? AlertSeverity.INFO).toLowerCase();
    if (Object.values(AlertSeverity).includes(normalized as AlertSeverity)) {
      return normalized as AlertSeverity;
    }
    return AlertSeverity.INFO;
  }

  isActionableSeverity(severity: AlertSeverity): boolean {
    return [
      AlertSeverity.CRITICAL,
      AlertSeverity.HIGH,
      AlertSeverity.WARNING,
    ].includes(severity);
  }

  shouldNotifySlack(severity: AlertSeverity, tier: EscalationTier): boolean {
    if (tier >= EscalationTier.TEAM) {
      return true;
    }
    return [AlertSeverity.CRITICAL, AlertSeverity.HIGH].includes(severity);
  }

  private parseEmails(value?: string | null): string[] {
    if (!value) {
      return [];
    }
    return value
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }
}
