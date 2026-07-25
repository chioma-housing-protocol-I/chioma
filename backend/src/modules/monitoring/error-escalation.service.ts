import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AlertPayload,
  AlertSeverity,
  EscalationTier,
  TrackedAlert,
} from './alert.types';
import { ErrorNotificationService } from './error-notification.service';

@Injectable()
export class ErrorEscalationService {
  private readonly logger = new Logger(ErrorEscalationService.name);
  private readonly activeAlerts = new Map<string, TrackedAlert>();

  constructor(
    private readonly configService: ConfigService,
    private readonly errorNotificationService: ErrorNotificationService,
  ) {}

  trackFiringAlert(alert: AlertPayload): TrackedAlert {
    const fingerprint = this.buildFingerprint(alert);
    const severity = this.resolveSeverity(alert.labels.severity);
    const existing = this.activeAlerts.get(fingerprint);

    if (existing) {
      existing.alert = alert;
      return existing;
    }

    const tracked: TrackedAlert = {
      fingerprint,
      alert,
      severity,
      firstFiredAt: new Date(alert.startsAt || Date.now()),
      lastEscalationTier: EscalationTier.ONCALL,
    };
    this.activeAlerts.set(fingerprint, tracked);
    return tracked;
  }

  resolveAlert(alert: AlertPayload): void {
    this.activeAlerts.delete(this.buildFingerprint(alert));
  }

  getActiveAlerts(): TrackedAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processEscalations(): Promise<void> {
    if (!this.errorNotificationService.isEnabled()) {
      return;
    }

    const tier2Minutes = this.getEscalationMinutes(
      'ALERT_ESCALATION_MINUTES',
      15,
    );
    const tier3Minutes = this.getEscalationMinutes(
      'ALERT_ESCALATION_TIER2_MINUTES',
      30,
    );

    for (const tracked of this.activeAlerts.values()) {
      if (
        !this.errorNotificationService.isActionableSeverity(tracked.severity)
      ) {
        continue;
      }

      const elapsedMinutes =
        (Date.now() - tracked.firstFiredAt.getTime()) / 60000;

      if (
        tracked.lastEscalationTier < EscalationTier.TEAM &&
        elapsedMinutes >= tier2Minutes
      ) {
        await this.escalate(tracked, EscalationTier.TEAM);
        continue;
      }

      if (
        tracked.lastEscalationTier < EscalationTier.MANAGEMENT &&
        elapsedMinutes >= tier3Minutes &&
        this.hasManagementRecipients()
      ) {
        await this.escalate(tracked, EscalationTier.MANAGEMENT);
      }
    }
  }

  private async escalate(
    tracked: TrackedAlert,
    tier: EscalationTier,
  ): Promise<void> {
    this.logger.warn(
      `Escalating alert ${tracked.alert.labels.alertname} to tier ${tier}`,
    );
    await this.errorNotificationService.notifyAlert(tracked.alert, tier);
    tracked.lastEscalationTier = tier;
  }

  buildFingerprint(alert: AlertPayload): string {
    const labels = Object.keys(alert.labels)
      .sort()
      .map((key) => `${key}=${alert.labels[key]}`)
      .join('|');
    return `${alert.labels.alertname ?? 'unknown'}::${labels}`;
  }

  private resolveSeverity(raw?: string): AlertSeverity {
    const normalized = (raw ?? AlertSeverity.INFO).toLowerCase();
    if (Object.values(AlertSeverity).includes(normalized as AlertSeverity)) {
      return normalized as AlertSeverity;
    }
    return AlertSeverity.INFO;
  }

  private getEscalationMinutes(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private hasManagementRecipients(): boolean {
    return (
      this.errorNotificationService.getRecipientsForTier(
        EscalationTier.MANAGEMENT,
      ).length > 0
    );
  }
}
