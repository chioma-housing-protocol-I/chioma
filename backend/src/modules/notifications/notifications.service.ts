import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsRealtimeService } from './notifications-realtime.service';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserPreferences,
  UserNotificationPreference,
} from '../users/entities/user-notification-preference.entity';
import { ErrorNotificationService } from '../monitoring/error-notification.service';
import { AlertPayload, EscalationTier } from '../monitoring/alert.types';

/**
 * Renders an unknown thrown value as a human-readable string. Plain objects are
 * JSON-serialized so alert descriptions carry the payload instead of the
 * useless '[object Object]' that default stringification would produce.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error === null || error === undefined) {
    return 'Unknown error';
  }
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unserializable error object';
    }
  }
  // Everything object-like is handled above, so only primitives reach here.
  return String(error as string | number | boolean | symbol | bigint);
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserNotificationPreference)
    private readonly preferencesRepository: Repository<UserNotificationPreference>,
    private readonly realtimeService: NotificationsRealtimeService,
    @Inject(forwardRef(() => ErrorNotificationService))
    private readonly errorNotificationService: ErrorNotificationService,
  ) {}

  async notify(
    userId: string,
    title: string,
    message: string,
    type: string,
  ): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create({
        userId,
        title,
        message,
        type,
      });

      const saved = await this.notificationRepository.save(notification);

      const preferences = await this.getUserPreferences(userId);
      if (this.shouldDeliverRealtime(preferences, type)) {
        this.realtimeService.emitToUser(userId, saved);
      }

      this.logger.log(`Notification sent to user ${userId}: ${title}`);
      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to send notification "${title}" to user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.alertNotificationFailure(userId, title, type, error);
      throw error;
    }
  }

  private async alertNotificationFailure(
    userId: string,
    title: string,
    type: string,
    error: unknown,
  ): Promise<void> {
    const alert: AlertPayload = {
      status: 'firing',
      labels: {
        alertname: 'NotificationDeliveryFailed',
        notificationType: type,
        severity: 'warning',
      },
      annotations: {
        summary: `Notification "${title}" failed to send to user ${userId}`,
        description: describeError(error),
      },
      startsAt: new Date().toISOString(),
      generatorURL: `notifications/${userId}`,
    };

    try {
      await this.errorNotificationService.notifyAlert(
        alert,
        EscalationTier.TEAM,
      );
    } catch (notifyError) {
      this.logger.error(
        'Failed to send notification-failure alert',
        notifyError instanceof Error ? notifyError.stack : String(notifyError),
      );
    }
  }

  async getUserNotifications(
    userId: string,
    filters?: { isRead?: boolean; type?: string },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (filters?.isRead !== undefined) {
      query.andWhere('notification.isRead = :isRead', {
        isRead: filters.isRead,
      });
    }

    if (filters?.type) {
      query.andWhere('notification.type = :type', { type: filters.type });
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });
  }

  async clearAll(userId: string): Promise<void> {
    await this.notificationRepository.delete({
      userId,
    });
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const record = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!record) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    const prefs = record.preferences;
    return {
      notifications: {
        email: {
          newPropertyMatches:
            prefs?.notifications?.email?.newPropertyMatches ??
            DEFAULT_NOTIFICATION_PREFERENCES.notifications.email
              .newPropertyMatches,
          paymentReminders:
            prefs?.notifications?.email?.paymentReminders ??
            DEFAULT_NOTIFICATION_PREFERENCES.notifications.email
              .paymentReminders,
          maintenanceUpdates:
            prefs?.notifications?.email?.maintenanceUpdates ??
            DEFAULT_NOTIFICATION_PREFERENCES.notifications.email
              .maintenanceUpdates,
        },
        push: {
          newMessages:
            prefs?.notifications?.push?.newMessages ??
            DEFAULT_NOTIFICATION_PREFERENCES.notifications.push.newMessages,
          criticalAlerts:
            prefs?.notifications?.push?.criticalAlerts ??
            DEFAULT_NOTIFICATION_PREFERENCES.notifications.push.criticalAlerts,
        },
        inAppSummary:
          prefs?.notifications?.inAppSummary ??
          DEFAULT_NOTIFICATION_PREFERENCES.notifications.inAppSummary,
      },
      appearanceTheme:
        prefs?.appearanceTheme ??
        DEFAULT_NOTIFICATION_PREFERENCES.appearanceTheme,
      language: prefs?.language ?? DEFAULT_NOTIFICATION_PREFERENCES.language,
      currency: prefs?.currency ?? DEFAULT_NOTIFICATION_PREFERENCES.currency,
    };
  }

  private shouldDeliverRealtime(
    preferences: UserPreferences,
    type: string,
  ): boolean {
    if (!preferences.notifications.inAppSummary) {
      return false;
    }

    const normalized = type.toLowerCase();

    if (
      normalized.includes('payment') &&
      !preferences.notifications.email.paymentReminders
    ) {
      return false;
    }

    if (
      (normalized.includes('maintenance') || normalized.includes('property')) &&
      !preferences.notifications.email.maintenanceUpdates
    ) {
      return false;
    }

    if (
      normalized.includes('message') &&
      !preferences.notifications.push.newMessages
    ) {
      return false;
    }

    return true;
  }
}
